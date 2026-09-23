import { pool } from "@/db";

export interface ProcessPaymentInput {
  orderId: string;
  idempotencyKey: string;
  amount: number; // in cents
  paymentMethod?: string;
  testOutcome?: "success" | "fail";
}

export interface ProcessPaymentResult {
  paymentId: string;
  orderId: string;
  paymentStatus: "PAID" | "FAILED" | "PENDING";
  orderStatus: string;
  isDuplicate: boolean;
  message: string;
}

export async function processPayment(
  input: ProcessPaymentInput
): Promise<ProcessPaymentResult> {
  const { orderId, idempotencyKey, amount, testOutcome = "success" } = input;

  if (!idempotencyKey || !idempotencyKey.trim()) {
    throw new Error("Payment idempotency key is required.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Idempotency check: Check if a payment with this idempotency key already exists
    const existingPaymentRes = await client.query(
      `SELECT p.id, p.order_id, p.payment_status, p.amount, o.status as order_status 
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.idempotency_key = $1`,
      [idempotencyKey]
    );

    if (existingPaymentRes.rows.length > 0) {
      const existing = existingPaymentRes.rows[0];
      await client.query("COMMIT");
      return {
        paymentId: existing.id,
        orderId: existing.order_id,
        paymentStatus: existing.payment_status,
        orderStatus: existing.order_status,
        isDuplicate: true,
        message: "Idempotent payment: previously processed with identical key.",
      };
    }

    // 2. Lock the target order
    const orderRes = await client.query(
      `SELECT id, order_reference, status, total_amount, hold_expires_at, pickup_date 
       FROM orders 
       WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error("Order not found.");
    }

    const order = orderRes.rows[0];

    // Check if order is expired or already cancelled
    if (order.status === "EXPIRED" || order.status === "CANCELLED") {
      throw new Error(`Cannot pay for an order in status: ${order.status}.`);
    }

    // Check if hold has expired
    if (order.status === "PENDING" && order.hold_expires_at && new Date(order.hold_expires_at) < new Date()) {
      throw new Error("Order reservation hold has expired. Please select your cakes again.");
    }

    // Validate amount
    if (amount !== order.total_amount) {
      throw new Error(`Payment amount mismatch. Expected: ${order.total_amount}, Provided: ${amount}`);
    }

    const isSuccess = testOutcome === "success";
    const paymentStatus = isSuccess ? "PAID" : "FAILED";
    const transactionId = `txn_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

    // 3. Insert payment record with idempotency key
    const paymentRes = await client.query(
      `INSERT INTO payments (
        order_id, idempotency_key, provider, payment_status, 
        amount, transaction_id, metadata, created_at, updated_at
      ) VALUES ($1, $2, 'test_gateway', $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, payment_status`,
      [
        order.id,
        idempotencyKey,
        paymentStatus,
        amount,
        transactionId,
        JSON.stringify({ testMode: true, outcome: testOutcome }),
      ]
    );

    const payment = paymentRes.rows[0];
    let newOrderStatus = order.status;

    if (isSuccess) {
      // 4. Confirm the order only after verified payment
      newOrderStatus = "CONFIRMED";
      await client.query(
        `UPDATE orders 
         SET status = 'CONFIRMED', hold_expires_at = NULL, updated_at = NOW() 
         WHERE id = $1`,
        [order.id]
      );

      // Record audit log
      await client.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
         VALUES ('ORDER_CONFIRMED_PAYMENT_SUCCESS', 'order', $1, $2, NOW())`,
        [
          order.id,
          JSON.stringify({
            orderReference: order.order_reference,
            paymentId: payment.id,
            transactionId,
            amount,
          }),
        ]
      );
    }

    await client.query("COMMIT");

    return {
      paymentId: payment.id,
      orderId: order.id,
      paymentStatus,
      orderStatus: newOrderStatus,
      isDuplicate: false,
      message: isSuccess
        ? "Payment verified successfully. Order confirmed!"
        : "Payment failed in test mode.",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
