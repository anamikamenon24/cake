import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireBaker } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Enforce baker authorization
    await requireBaker();

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const statusParam = searchParams.get("status");
    const searchParam = searchParams.get("search");

    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          o.id, o.order_reference, o.pickup_date, o.status, o.total_amount, 
          o.hold_expires_at, o.customer_name, o.customer_email, o.customer_phone,
          o.cancellation_reason, o.created_at, o.updated_at,
          s.start_time, s.end_time,
          COALESCE(
            json_agg(
              jsonb_build_object(
                'id', oi.id,
                'productId', p.id,
                'productName', p.name,
                'imageUrl', p.image_url,
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
        WHERE 1=1
      `;

      const params: any[] = [];
      let idx = 1;

      if (dateParam && dateParam !== "all") {
        query += ` AND o.pickup_date = $${idx++}`;
        params.push(dateParam);
      }

      if (statusParam && statusParam !== "all") {
        query += ` AND o.status = $${idx++}`;
        params.push(statusParam);
      }

      if (searchParam && searchParam.trim()) {
        query += ` AND (o.order_reference ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_phone ILIKE $${idx})`;
        params.push(`%${searchParam.trim()}%`);
        idx++;
      }

      query += ` GROUP BY o.id, s.start_time, s.end_time ORDER BY o.pickup_date ASC, s.start_time ASC, o.created_at DESC`;

      const res = await client.query(query, params);

      const orders = res.rows.map((row) => ({
        id: row.id,
        orderReference: row.order_reference,
        pickupDate: row.pickup_date,
        pickupSlotDisplay: `${row.start_time?.slice(0, 5)} - ${row.end_time?.slice(0, 5)}`,
        status: row.status,
        totalAmount: row.total_amount,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        cancellationReason: row.cancellation_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: typeof row.items === "string" ? JSON.parse(row.items) : row.items,
      }));

      return NextResponse.json({ orders });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Baker orders error:", error);
    const status = error.message?.includes("Baker privileges") ? 403 : error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to load baker orders" },
      { status }
    );
  }
}
