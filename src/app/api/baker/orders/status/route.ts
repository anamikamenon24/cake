import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireBaker } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const baker = await requireBaker();
    const body = await request.json();
    const { orderId, newStatus } = body;

    const validStatuses = ["BAKING", "READY", "COLLECTED", "CANCELLED", "REFUNDED"];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition: ${newStatus}` },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const orderRes = await client.query(
        `SELECT id, order_reference, status FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const prevStatus = orderRes.rows[0].status;

      await client.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, orderId]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details, created_at)
         VALUES ('ORDER_STATUS_UPDATED', 'order', $1, $2, $3, NOW())`,
        [
          orderId,
          baker.id,
          JSON.stringify({
            orderReference: orderRes.rows[0].order_reference,
            fromStatus: prevStatus,
            toStatus: newStatus,
            updatedBy: baker.email,
          }),
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        orderId,
        fromStatus: prevStatus,
        toStatus: newStatus,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error updating order status:", error);
    const status = error.message?.includes("Baker privileges") ? 403 : error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to update order status" },
      { status }
    );
  }
}
