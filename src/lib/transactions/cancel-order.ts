import { pool } from "@/db";
import { CANCELLATION_CUTOFF_HOURS } from "../types";

export interface CancelOrderInput {
  orderId: string;
  userId?: string | null;
  userRole?: "customer" | "baker";
  reason?: string;
}

export interface CancelOrderResult {
  orderId: string;
  orderReference: string;
  status: "CANCELLED";
  freedCakes: number;
}

export async function cancelOrder(input: CancelOrderInput): Promise<CancelOrderResult> {
  const { orderId, userId, userRole = "customer", reason } = input;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock order row
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error("Order not found.");
    }

    const order = orderRes.rows[0];

    // Get pickup slot start time for cutoff comparison
    let startTimeStr = "00:00:00";
    if (order.pickup_slot_id) {
      const slotRes = await client.query(
        `SELECT start_time FROM pickup_slots WHERE id = $1`,
        [order.pickup_slot_id]
      );
      if (slotRes.rows.length > 0) {
        startTimeStr = slotRes.rows[0].start_time;
      }
    }

    // Authorization: if customer, cannot cancel someone else's order
    if (userRole === "customer" && userId && order.user_id && order.user_id !== userId) {
      throw new Error("Unauthorized: You can only cancel your own orders.");
    }

    // Check status
    if (order.status === "CANCELLED" || order.status === "EXPIRED" || order.status === "COLLECTED") {
      throw new Error(`Cannot cancel order in status: ${order.status}`);
    }

    // Customer 24-hour cut-off rule
    if (userRole === "customer") {
      const now = new Date();
      const dateStr =
        order.pickup_date instanceof Date
          ? order.pickup_date.toISOString().split("T")[0]
          : String(order.pickup_date).split("T")[0];
      const validTimeStr = startTimeStr?.includes(":") ? startTimeStr : "00:00:00";
      const pickupDateTime = new Date(`${dateStr}T${validTimeStr}Z`);
      const hoursUntilPickup = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (isNaN(hoursUntilPickup) || hoursUntilPickup < CANCELLATION_CUTOFF_HOURS) {
        throw new Error(
          `Cancellations must be requested at least ${CANCELLATION_CUTOFF_HOURS} hours before your scheduled pickup. Your pickup is scheduled in less than 24 hours.`
        );
      }
    }

    // 2. Count cakes in order to restore capacity
    const itemsRes = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total_cakes 
       FROM order_items 
       WHERE order_id = $1`,
      [order.id]
    );
    const cakeCount = parseInt(itemsRes.rows[0].total_cakes, 10) || 1;

    // 3. Decrement reserved_cakes in daily_capacity
    await client.query(
      `UPDATE daily_capacity 
       SET reserved_cakes = GREATEST(0, reserved_cakes - $1), updated_at = NOW() 
       WHERE bakery_date = $2`,
      [cakeCount, order.pickup_date]
    );

    // 4. Decrement reserved_orders in pickup_slots
    if (order.pickup_slot_id) {
      await client.query(
        `UPDATE pickup_slots 
         SET reserved_orders = GREATEST(0, reserved_orders - 1) 
         WHERE id = $1`,
        [order.pickup_slot_id]
      );
    }

    // 5. Update order status to CANCELLED
    await client.query(
      `UPDATE orders 
       SET status = 'CANCELLED', cancellation_reason = $1, updated_at = NOW() 
       WHERE id = $2`,
      [reason || "Cancelled by customer", order.id]
    );

    // 6. Record audit log
    await client.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details, created_at)
       VALUES ('ORDER_CANCELLED', 'order', $1, $2, $3, NOW())`,
      [
        order.id,
        userId || null,
        JSON.stringify({
          orderReference: order.order_reference,
          freedCakes: cakeCount,
          reason,
          role: userRole,
        }),
      ]
    );

    await client.query("COMMIT");

    return {
      orderId: order.id,
      orderReference: order.order_reference,
      status: "CANCELLED",
      freedCakes: cakeCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
