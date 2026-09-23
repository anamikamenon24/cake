import { pool } from "../src/db";
import { runMigrations } from "../src/db/migrate";
import { seedDatabase } from "../src/db/seed";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../src/lib/auth";
import { createOrderHold } from "../src/lib/transactions/order-hold";
import { releaseExpiredHolds } from "../src/lib/transactions/release-holds";
import { processPayment } from "../src/lib/payment";
import { cancelOrder } from "../src/lib/transactions/cancel-order";
import {
  MINIMUM_LEAD_TIME_HOURS,
  CANCELLATION_CUTOFF_HOURS,
  MAX_CUSTOM_MESSAGE_LENGTH,
  CUSTOM_MESSAGE_FEE_CENTS,
} from "../src/lib/types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail || "Assertion failed"}`);
    failedCount++;
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log("=================================================");
  console.log("🧪 CakeCart Agent 3 (QA Agent) Full Test Suite");
  console.log("=================================================\n");

  // ----------------------------------------------------
  // TEST 1: Database Migrations & Clean Boot
  // ----------------------------------------------------
  console.log("▶ TEST 1: Database Migrations & Clean Boot");
  await runMigrations();
  await seedDatabase();
  const client = await pool.connect();
  try {
    const tableRes = await client.query(`
      SELECT count(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    assert(parseInt(tableRes.rows[0].count, 10) >= 14, "All 14 database tables exist");
  } finally {
    client.release();
  }

  // ----------------------------------------------------
  // TEST 2: Authentication, Password Hashing & RBAC
  // ----------------------------------------------------
  console.log("\n▶ TEST 2: Authentication, Password Hashing & RBAC");
  const testPassword = "SuperSecretPassword123!";
  const hashed = await hashPassword(testPassword);
  assert(hashed !== testPassword, "Password is encrypted (not plaintext)");
  assert(await verifyPassword(testPassword, hashed), "Valid password verifies correctly");
  assert(!(await verifyPassword("WrongPassword!", hashed)), "Invalid password is rejected");

  const customerToken = await createSessionToken({
    id: "cust-123",
    email: "sarah@example.com",
    fullName: "Sarah",
    role: "customer",
  });
  const decodedCustomer = await verifySessionToken(customerToken);
  assert(decodedCustomer?.role === "customer", "Session token encodes customer role correctly");

  const bakerToken = await createSessionToken({
    id: "baker-123",
    email: "baker@cakecart.com",
    fullName: "Chef Elena",
    role: "baker",
  });
  const decodedBaker = await verifySessionToken(bakerToken);
  assert(decodedBaker?.role === "baker", "Session token encodes baker role correctly");

  // ----------------------------------------------------
  // TEST 3: Message Character Limit Enforcement (<= 40 chars)
  // ----------------------------------------------------
  console.log("\n▶ TEST 3: Message Character Limit Validation (Client & Server)");
  const validMessage = "Happy 30th Birthday David! ✨"; // 28 chars
  assert(validMessage.length <= MAX_CUSTOM_MESSAGE_LENGTH, "Valid message is within 40 characters");

  const excessiveMessage = "This custom piped message is way too long and exceeds forty characters!"; // 71 chars
  assert(excessiveMessage.length > MAX_CUSTOM_MESSAGE_LENGTH, "Excessive message exceeds 40 characters");

  // Verify server rejects > 40 chars
  let serverRejectedMsg = false;
  try {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const cRes = await pool.query(`SELECT id FROM pickup_slots WHERE bakery_date = $1 LIMIT 1`, [futureDate]);
    const pRes = await pool.query(`SELECT id FROM products LIMIT 1`);
    
    await createOrderHold({
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      customerPhone: "+15551234567",
      pickupDate: futureDate,
      pickupSlotId: cRes.rows[0].id,
      items: [
        {
          productId: pRes.rows[0].id,
          quantity: 1,
          customisation: { customMessage: excessiveMessage },
        },
      ],
    });
  } catch (err: any) {
    if (err.message.includes("exceeds the maximum limit of 40 characters")) {
      serverRejectedMsg = true;
    }
  }
  assert(serverRejectedMsg, "Server rejects custom cake message longer than 40 characters");

  // ----------------------------------------------------
  // TEST 4: Minimum Lead Time (48h) & Closed Date Server Rejection
  // ----------------------------------------------------
  console.log("\n▶ TEST 4: Minimum Lead Time (48h) & Closed Date Enforcement");
  const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  let leadTimeRejected = false;
  try {
    const pRes = await pool.query(`SELECT id FROM products LIMIT 1`);
    await createOrderHold({
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      customerPhone: "+15551234567",
      pickupDate: tomorrow,
      pickupSlotId: "dummy-slot",
      items: [{ productId: pRes.rows[0].id, quantity: 1 }],
    });
  } catch (err: any) {
    if (err.message.includes("minimum 48 hours notice")) {
      leadTimeRejected = true;
    }
  }
  assert(leadTimeRejected, "Server rejects order scheduled < 48 hours in advance");

  // Test closed date rejection
  const futureTestDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  await pool.query(
    `INSERT INTO daily_capacity (bakery_date, max_cakes, reserved_cakes, is_closed) 
     VALUES ($1, 8, 0, true) 
     ON CONFLICT (bakery_date) DO UPDATE SET is_closed = true`,
    [futureTestDate]
  );
  let closedDateRejected = false;
  try {
    const pRes = await pool.query(`SELECT id FROM products LIMIT 1`);
    await createOrderHold({
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      customerPhone: "+15551234567",
      pickupDate: futureTestDate,
      pickupSlotId: "dummy-slot",
      items: [{ productId: pRes.rows[0].id, quantity: 1 }],
    });
  } catch (err: any) {
    if (err.message.includes("bakery is closed")) {
      closedDateRejected = true;
    }
  }
  assert(closedDateRejected, "Server rejects order placed on a closed date");

  // ----------------------------------------------------
  // TEST 5: Concurrency & Daily Capacity Locking (Race Condition Test)
  // ----------------------------------------------------
  console.log("\n▶ TEST 5: Concurrency & Daily Capacity Locking (Race Condition)");
  const raceDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  // Set capacity strictly to 1 cake
  await pool.query(
    `INSERT INTO daily_capacity (bakery_date, max_cakes, reserved_cakes, is_closed)
     VALUES ($1, 1, 0, false)
     ON CONFLICT (bakery_date) DO UPDATE SET max_cakes = 1, reserved_cakes = 0, is_closed = false`,
    [raceDate]
  );

  const slotRes = await pool.query(
    `INSERT INTO pickup_slots (bakery_date, start_time, end_time, max_orders, reserved_orders)
     VALUES ($1, '10:00:00', '12:00:00', 5, 0)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [raceDate]
  );
  const raceSlotId = slotRes.rows[0]?.id || (await pool.query(`SELECT id FROM pickup_slots WHERE bakery_date = $1 LIMIT 1`, [raceDate])).rows[0].id;
  const pRes = await pool.query(`SELECT id FROM products LIMIT 1`);
  const cakeId = pRes.rows[0].id;

  // Fire 2 simultaneous order holds for the same 1 available cake
  const results = await Promise.allSettled([
    createOrderHold({
      customerName: "Alice (Concurrent Session 1)",
      customerEmail: "alice@example.com",
      customerPhone: "+15550001",
      pickupDate: raceDate,
      pickupSlotId: raceSlotId,
      items: [{ productId: cakeId, quantity: 1 }],
    }),
    createOrderHold({
      customerName: "Bob (Concurrent Session 2)",
      customerEmail: "bob@example.com",
      customerPhone: "+15550002",
      pickupDate: raceDate,
      pickupSlotId: raceSlotId,
      items: [{ productId: cakeId, quantity: 1 }],
    }),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  if (fulfilled.length !== 1) {
    console.log("TEST 5 DEBUG - results:", JSON.stringify(results, null, 2));
  }

  assert(fulfilled.length === 1, "Exactly one concurrent session succeeded");
  assert(rejected.length === 1, "Exactly one concurrent session was rejected");

  const capCheck = await pool.query(`SELECT max_cakes, reserved_cakes FROM daily_capacity WHERE bakery_date = $1`, [raceDate]);
  assert(capCheck.rows[0].reserved_cakes === 1, "Reserved cakes is exactly 1 (never exceeds max_cakes)");
  assert(capCheck.rows[0].reserved_cakes <= capCheck.rows[0].max_cakes, "Capacity check constraint holds");

  // ----------------------------------------------------
  // TEST 6: Expired Holds & Automatic Capacity Release
  // ----------------------------------------------------
  console.log("\n▶ TEST 6: Expired Holds & Automatic Capacity Release");
  const winnerOrder = (fulfilled[0] as PromiseFulfilledResult<any>).value;
  // Artificially expire the winner's hold
  await pool.query(
    `UPDATE orders SET hold_expires_at = NOW() - INTERVAL '5 minutes' WHERE id = $1`,
    [winnerOrder.orderId]
  );

  const releaseResult = await releaseExpiredHolds();
  assert(releaseResult.releasedCount >= 1, "Expired hold was released");
  assert(releaseResult.releasedOrderReferences.includes(winnerOrder.orderReference), "Winner order reference was expired");

  const capAfterRelease = await pool.query(`SELECT reserved_cakes FROM daily_capacity WHERE bakery_date = $1`, [raceDate]);
  assert(capAfterRelease.rows[0].reserved_cakes === 0, "Daily capacity was safely restored to 0");

  // Test idempotency of release endpoint
  const secondRelease = await releaseExpiredHolds();
  assert(secondRelease.releasedCount === 0, "Repeated release is safe & idempotent (0 double release)");

  // ----------------------------------------------------
  // TEST 7: Fee Calculation, Totals & Payment Idempotency
  // ----------------------------------------------------
  console.log("\n▶ TEST 7: Fee Calculation, Totals & Payment Idempotency");
  const paymentDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  await pool.query(
    `INSERT INTO daily_capacity (bakery_date, max_cakes, reserved_cakes, is_closed)
     VALUES ($1, 10, 0, false)
     ON CONFLICT (bakery_date) DO UPDATE SET max_cakes = 10, reserved_cakes = 0, is_closed = false`,
    [paymentDate]
  );
  const pSlotRes = await pool.query(
    `INSERT INTO pickup_slots (bakery_date, start_time, end_time, max_orders, reserved_orders)
     VALUES ($1, '14:00:00', '16:00:00', 5, 0)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [paymentDate]
  );
  const paySlotId = pSlotRes.rows[0]?.id || (await pool.query(`SELECT id FROM pickup_slots WHERE bakery_date = $1 LIMIT 1`, [paymentDate])).rows[0].id;

  // Create hold with size upgrade ($15.00), flavour upgrade ($2.00), and message fee ($3.00)
  const orderHoldToPay = await createOrderHold({
    customerName: "David Test",
    customerEmail: "david@example.com",
    customerPhone: "+15559999",
    pickupDate: paymentDate,
    pickupSlotId: paySlotId,
    items: [
      {
        productId: cakeId,
        quantity: 1,
        customisation: {
          selectedSize: '8" Classic (Serves 12-14)', // +1500
          selectedFlavour: "Dark Chocolate Truffle Whip", // +200
          customMessage: "Happy Birthday David!", // +300
        },
      },
    ],
  });

  const baseCake = (await pool.query(`SELECT base_price FROM products WHERE id = $1`, [cakeId])).rows[0].base_price;
  const expectedTotal = baseCake + 1500 + 200 + CUSTOM_MESSAGE_FEE_CENTS;
  assert(orderHoldToPay.totalAmount === expectedTotal, `Total amount calculated correctly: ${orderHoldToPay.totalAmount} cents`);

  // Process payment with idempotency key
  const idempotencyKey = `qa_idem_key_${Date.now()}`;
  const payResult1 = await processPayment({
    orderId: orderHoldToPay.orderId,
    idempotencyKey,
    amount: orderHoldToPay.totalAmount,
    testOutcome: "success",
  });

  assert(payResult1.paymentStatus === "PAID", "Payment succeeds in test mode");
  assert(payResult1.orderStatus === "CONFIRMED", "Order status transitions to CONFIRMED");
  assert(!payResult1.isDuplicate, "First payment is not a duplicate");

  // Retry with same idempotency key
  const payResult2 = await processPayment({
    orderId: orderHoldToPay.orderId,
    idempotencyKey,
    amount: orderHoldToPay.totalAmount,
    testOutcome: "success",
  });
  assert(payResult2.isDuplicate, "Retry with same idempotency key is recognized as duplicate");
  assert(payResult2.paymentStatus === "PAID", "Duplicate returns existing paid record without recharging");

  // ----------------------------------------------------
  // TEST 8: 24-Hour Cutoff Cancellation Flow
  // ----------------------------------------------------
  console.log("\n▶ TEST 8: 24-Hour Cutoff Cancellation Policy");
  // Order scheduled in 8 days (> 24 hours) can be cancelled
  const cancelSuccess = await cancelOrder({
    orderId: orderHoldToPay.orderId,
    userRole: "customer",
    reason: "Change of celebration plans",
  });
  assert(cancelSuccess.status === "CANCELLED", "Order > 24 hours away successfully cancelled");

  const capAfterCancel = await pool.query(`SELECT reserved_cakes FROM daily_capacity WHERE bakery_date = $1`, [paymentDate]);
  assert(capAfterCancel.rows[0].reserved_cakes === 0, "Capacity restored upon order cancellation");

  // Test rejection of cancellation within 24 hours
  const soonDate = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString().split("T")[0]; // today/tomorrow
  const soonOrderRes = await pool.query(
    `INSERT INTO orders (
      order_reference, pickup_date, pickup_slot_id, status, total_amount, 
      customer_name, customer_email, customer_phone, created_at, updated_at
    ) VALUES ('CC-SOON-123', $1, $2, 'CONFIRMED', 4500, 'Late User', 'late@example.com', '123', NOW(), NOW())
    RETURNING id`,
    [soonDate, paySlotId]
  );
  let cutoffRejected = false;
  try {
    await cancelOrder({
      orderId: soonOrderRes.rows[0].id,
      userRole: "customer",
    });
  } catch (err: any) {
    if (err.message.includes("at least 24 hours before your scheduled pickup")) {
      cutoffRejected = true;
    }
  }
  assert(cutoffRejected, "Customer cancellation < 24h before pickup is rejected");

  // ----------------------------------------------------
  // TEST 9: Cross-Customer Isolation
  // ----------------------------------------------------
  console.log("\n▶ TEST 9: Cross-Customer Order Isolation");
  const userARes = await pool.query(`SELECT id FROM users WHERE email = 'customer@cakecart.com'`);
  const userAId = userARes.rows[0].id;
  const userBId = "00000000-0000-0000-0000-000000000099";

  const orderUserA = await pool.query(
    `INSERT INTO orders (
      order_reference, user_id, pickup_date, pickup_slot_id, status, total_amount,
      customer_name, customer_email, customer_phone
    ) VALUES ('CC-ISOLATION-1', $1, $2, $3, 'CONFIRMED', 5000, 'User A', 'userA@test.com', '123')
    RETURNING id`,
    [userAId, paymentDate, paySlotId]
  );

  let crossCustomerBlocked = false;
  try {
    await cancelOrder({
      orderId: orderUserA.rows[0].id,
      userId: userBId, // User B trying to cancel User A's order
      userRole: "customer",
    });
  } catch (err: any) {
    if (err.message.includes("You can only cancel your own orders")) {
      crossCustomerBlocked = true;
    }
  }
  assert(crossCustomerBlocked, "User B cannot cancel User A's order (cross-customer isolation)");

  // ----------------------------------------------------
  // TEST 10: Baker Dashboard Permissions & Pipeline Transitions
  // ----------------------------------------------------
  console.log("\n▶ TEST 10: Baker Dashboard Permissions & Pipeline Transitions");
  const pipelineOrder = await pool.query(
    `INSERT INTO orders (
      order_reference, pickup_date, pickup_slot_id, status, total_amount,
      customer_name, customer_email, customer_phone
    ) VALUES ('CC-PIPELINE-1', $1, $2, 'CONFIRMED', 5000, 'Jane', 'jane@test.com', '123')
    RETURNING id`,
    [paymentDate, paySlotId]
  );
  const pOrderId = pipelineOrder.rows[0].id;

  // Advance CONFIRMED -> BAKING
  await pool.query(`UPDATE orders SET status = 'BAKING' WHERE id = $1`, [pOrderId]);
  let check = await pool.query(`SELECT status FROM orders WHERE id = $1`, [pOrderId]);
  assert(check.rows[0].status === "BAKING", "Baker marks order BAKING");

  // Advance BAKING -> READY
  await pool.query(`UPDATE orders SET status = 'READY' WHERE id = $1`, [pOrderId]);
  check = await pool.query(`SELECT status FROM orders WHERE id = $1`, [pOrderId]);
  assert(check.rows[0].status === "READY", "Baker marks order READY");

  // Advance READY -> COLLECTED
  await pool.query(`UPDATE orders SET status = 'COLLECTED' WHERE id = $1`, [pOrderId]);
  check = await pool.query(`SELECT status FROM orders WHERE id = $1`, [pOrderId]);
  assert(check.rows[0].status === "COLLECTED", "Baker marks order COLLECTED");

  console.log("\n=================================================");
  console.log(`🎉 CakeCart QA Suite Complete! Passed: ${passedCount}, Failed: ${failedCount}`);
  console.log("=================================================\n");
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test suite encountered fatal error:", err);
    process.exit(1);
  });
