import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Strictly filter by logged in user's ID
      const ordersRes = await client.query(
        `SELECT 
          o.id, o.order_reference, o.pickup_date, o.status, o.total_amount, 
          o.hold_expires_at, o.customer_name, o.customer_email, o.customer_phone,
          o.cancellation_reason, o.created_at,
          s.start_time, s.end_time,
          COALESCE(
            json_agg(
              jsonb_build_object(
                'id', oi.id,
                'productId', p.id,
                'productName', p.name,
                'quantity', oi.quantity,
                'unitPrice', oi.unit_price,
                'totalPrice', oi.total_price,
                'selectedSize', oc.selected_size,
                'selectedFlavour', oc.selected_flavour,
                'customMessage', oc.custom_message,
                'messageFee', COALESCE(oc.message_fee, 0),
                'referenceImageUrl', oc.reference_image_url
              )
            ) FILTER (WHERE oi.id IS NOT NULL), '[]'
          ) as items
         FROM orders o
         LEFT JOIN pickup_slots s ON o.pickup_slot_id = s.id
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         LEFT JOIN order_customisations oc ON oi.id = oc.order_item_id
         WHERE o.user_id = $1
         GROUP BY o.id, s.start_time, s.end_time
         ORDER BY o.created_at DESC`,
        [user.id]
      );

      const now = new Date();

      const orders = ordersRes.rows.map((row) => {
        const startTimeStr = row.start_time || "00:00:00";
        const pickupDateObj = new Date(`${row.pickup_date}T${startTimeStr}Z`);
        const hoursUntilPickup = (pickupDateObj.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Can cancel only if status is PENDING or CONFIRMED and at least 24 hours before pickup
        const isEligibleForCancellation =
          (row.status === "PENDING" || row.status === "CONFIRMED") &&
          hoursUntilPickup >= 24;

        return {
          id: row.id,
          orderReference: row.order_reference,
          pickupDate: row.pickup_date,
          pickupSlotDisplay: `${row.start_time?.slice(0, 5)} - ${row.end_time?.slice(0, 5)}`,
          status: row.status,
          totalAmount: row.total_amount,
          holdExpiresAt: row.hold_expires_at,
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          customerPhone: row.customer_phone,
          cancellationReason: row.cancellation_reason,
          createdAt: row.created_at,
          isEligibleForCancellation,
          hoursUntilPickup: Math.round(hoursUntilPickup * 10) / 10,
          items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
        };
      });

      return NextResponse.json({ orders });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching my-orders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load orders" },
      { status: 500 }
    );
  }
}
