import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import QRCode from "qrcode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;
    const client = await pool.connect();

    try {
      const orderRes = await client.query(
        `SELECT 
          o.id, o.order_reference, o.user_id, o.pickup_date, o.status, o.total_amount, 
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
         WHERE o.order_reference = $1 OR o.id::text = $1
         GROUP BY o.id, s.start_time, s.end_time`,
        [reference]
      );

      if (orderRes.rows.length === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const order = orderRes.rows[0];

      // Fetch payment record
      const paymentRes = await client.query(
        `SELECT id, payment_status, provider, amount, transaction_id, created_at 
         FROM payments 
         WHERE order_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [order.id]
      );

      const payment = paymentRes.rows.length > 0 ? paymentRes.rows[0] : null;

      // Generate collection verification QR code
      const qrPayload = JSON.stringify({
        ref: order.order_reference,
        id: order.id,
        date: order.pickup_date,
        slot: `${order.start_time?.slice(0, 5)} - ${order.end_time?.slice(0, 5)}`,
        status: order.status,
        customer: order.customer_name,
        amount: order.total_amount,
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 320,
        color: {
          dark: "#3E2718",
          light: "#FFFFFF",
        },
      });

      return NextResponse.json({
        order: {
          id: order.id,
          orderReference: order.order_reference,
          userId: order.user_id,
          pickupDate: order.pickup_date,
          pickupSlotDisplay: `${order.start_time?.slice(0, 5)} - ${order.end_time?.slice(0, 5)}`,
          status: order.status,
          totalAmount: order.total_amount,
          holdExpiresAt: order.hold_expires_at,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          cancellationReason: order.cancellation_reason,
          createdAt: order.created_at,
          items: typeof order.items === "string" ? JSON.parse(order.items) : order.items,
          payment: payment
            ? {
                id: payment.id,
                paymentStatus: payment.payment_status,
                provider: payment.provider,
                amount: payment.amount,
                transactionId: payment.transaction_id,
              }
            : null,
          qrCodeDataUrl,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching order reference:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load order" },
      { status: 500 }
    );
  }
}
