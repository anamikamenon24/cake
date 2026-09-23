import { pool } from "@/db";

export interface ReleaseHoldsResult {
  releasedCount: number;
  releasedOrderReferences: string[];
}

export async function releaseExpiredHolds(): Promise<ReleaseHoldsResult> {
  const client = await pool.connect();
  const releasedOrderReferences: string[] = [];

  try {
    // 1. Query for pending orders whose hold has expired
    const expiredRes = await client.query(
      `SELECT id, order_reference, pickup_date, pickup_slot_id 
       FROM orders 
       WHERE status = 'PENDING' AND hold_expires_at IS NOT NULL AND hold_expires_at < NOW()`
    );

    for (const row of expiredRes.rows) {
      try {
        await client.query("BEGIN");

        // Re-lock the order row to ensure it's still PENDING (idempotency safeguard)
        const checkOrder = await client.query(
          `SELECT id, status, pickup_date, pickup_slot_id, order_reference 
           FROM orders 
           WHERE id = $1 FOR UPDATE`,
          [row.id]
        );

        if (checkOrder.rows.length === 0 || checkOrder.rows[0].status !== "PENDING") {
          await client.query("ROLLBACK");
          continue; // Already processed or paid
        }

        // Calculate cake count
        const itemsRes = await client.query(
          `SELECT COALESCE(SUM(quantity), 0) AS total_cakes 
           FROM order_items 
           WHERE order_id = $1`,
          [row.id]
        );
        const cakeCount = parseInt(itemsRes.rows[0].total_cakes, 10) || 1;

        // Decrement daily_capacity reserved_cakes
        await client.query(
          `UPDATE daily_capacity 
           SET reserved_cakes = GREATEST(0, reserved_cakes - $1), updated_at = NOW() 
           WHERE bakery_date = $2`,
          [cakeCount, row.pickup_date]
        );

        // Decrement pickup_slots reserved_orders
        if (row.pickup_slot_id) {
          await client.query(
            `UPDATE pickup_slots 
             SET reserved_orders = GREATEST(0, reserved_orders - 1) 
             WHERE id = $1`,
            [row.pickup_slot_id]
          );
        }

        // Mark order as EXPIRED
        await client.query(
          `UPDATE orders 
           SET status = 'EXPIRED', updated_at = NOW() 
           WHERE id = $1`,
          [row.id]
        );

        // Record audit log
        await client.query(
          `INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
           VALUES ('ORDER_HOLD_EXPIRED_RELEASED', 'order', $1, $2, NOW())`,
          [
            row.id,
            JSON.stringify({
              orderReference: row.order_reference,
              releasedCakes: cakeCount,
              pickupDate: row.pickup_date,
            }),
          ]
        );

        await client.query("COMMIT");
        releasedOrderReferences.push(row.order_reference);
      } catch (innerErr) {
        await client.query("ROLLBACK");
        console.error(`Failed to release hold for order ${row.order_reference}:`, innerErr);
      }
    }

    return {
      releasedCount: releasedOrderReferences.length,
      releasedOrderReferences,
    };
  } finally {
    client.release();
  }
}
