import { pool } from "@/db";
import {
  MINIMUM_LEAD_TIME_HOURS,
  MAX_CUSTOM_MESSAGE_LENGTH,
  CUSTOM_MESSAGE_FEE_CENTS,
  HOLD_EXPIRATION_MINUTES,
} from "../types";

export interface CreateOrderHoldInput {
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupDate: string; // YYYY-MM-DD
  pickupSlotId: string;
  items: {
    productId: string;
    quantity: number;
    customisation?: {
      selectedSize?: string;
      selectedFlavour?: string;
      customMessage?: string;
      referenceImageUrl?: string | null;
    };
  }[];
}

export interface CreateOrderHoldResult {
  orderId: string;
  orderReference: string;
  totalAmount: number;
  holdExpiresAt: string;
  pickupDate: string;
}

export async function createOrderHold(
  input: CreateOrderHoldInput
): Promise<CreateOrderHoldResult> {
  const {
    userId,
    customerName,
    customerEmail,
    customerPhone,
    pickupDate,
    pickupSlotId,
    items,
  } = input;

  // ----------------------------------------------------
  // Server Validation 1: Customer Contact info
  // ----------------------------------------------------
  if (!customerName?.trim() || !customerEmail?.trim() || !customerPhone?.trim()) {
    throw new Error("Customer name, email, and phone number are required.");
  }

  if (!items || items.length === 0) {
    throw new Error("Cart is empty.");
  }

  // ----------------------------------------------------
  // Server Validation 2: Lead Time Enforcement (>= 48h)
  // ----------------------------------------------------
  const now = new Date();
  const targetPickupDateTime = new Date(`${pickupDate}T00:00:00Z`);
  const diffHours = (targetPickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < MINIMUM_LEAD_TIME_HOURS) {
    throw new Error(
      `Orders require a minimum ${MINIMUM_LEAD_TIME_HOURS} hours notice. The earliest available date is 2 days from today.`
    );
  }

  // ----------------------------------------------------
  // Server Validation 3: Message Character Limit (<= 40)
  // ----------------------------------------------------
  for (const item of items) {
    if (item.customisation?.customMessage) {
      if (item.customisation.customMessage.length > MAX_CUSTOM_MESSAGE_LENGTH) {
        throw new Error(
          `Custom cake message "${item.customisation.customMessage}" exceeds the maximum limit of ${MAX_CUSTOM_MESSAGE_LENGTH} characters.`
        );
      }
    }
  }

  const totalCakes = items.reduce((sum, it) => sum + it.quantity, 0);
  if (totalCakes <= 0) {
    throw new Error("Must order at least one cake.");
  }

  const client = await pool.connect();

  try {
    // Step 1: Begin transaction
    await client.query("BEGIN");

    // Step 2: Lock daily_capacity row for update
    const capRes = await client.query(
      `SELECT * FROM daily_capacity WHERE bakery_date = $1 FOR UPDATE`,
      [pickupDate]
    );

    if (capRes.rows.length === 0) {
      throw new Error(`The bakery has not set capacity for ${pickupDate}.`);
    }

    const capacityRow = capRes.rows[0];

    if (capacityRow.is_closed) {
      throw new Error(`The bakery is closed on ${pickupDate}.`);
    }

    // Step 3: Confirm remaining capacity covers number of cakes
    const remainingCakes = capacityRow.max_cakes - capacityRow.reserved_cakes;
    if (remainingCakes < totalCakes) {
      throw new Error(
        `Insufficient capacity for ${pickupDate}. Requested: ${totalCakes}, Available: ${remainingCakes}.`
      );
    }

    // Step 2b: Lock pickup_slot row for update
    const slotRes = await client.query(
      `SELECT * FROM pickup_slots WHERE id = $1 AND bakery_date = $2 FOR UPDATE`,
      [pickupSlotId, pickupDate]
    );

    if (slotRes.rows.length === 0) {
      throw new Error(`The selected pickup slot does not exist for ${pickupDate}.`);
    }

    const slotRow = slotRes.rows[0];
    const remainingOrders = slotRow.max_orders - slotRow.reserved_orders;
    if (remainingOrders < 1) {
      throw new Error(
        `The selected pickup slot (${slotRow.start_time.slice(0, 5)} - ${slotRow.end_time.slice(0, 5)}) is fully booked.`
      );
    }

    // Step 4: Increment reserved_cakes and slot usage (temporary hold)
    await client.query(
      `UPDATE daily_capacity 
       SET reserved_cakes = reserved_cakes + $1, updated_at = NOW() 
       WHERE id = $2`,
      [totalCakes, capacityRow.id]
    );

    await client.query(
      `UPDATE pickup_slots 
       SET reserved_orders = reserved_orders + 1 
       WHERE id = $1`,
      [slotRow.id]
    );

    // Step 5: Calculate price on the server (base + size + flavour + message fee)
    let calculatedTotalAmount = 0;
    const itemRecords: {
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      customisation?: {
        selectedSize?: string;
        selectedFlavour?: string;
        customMessage?: string | null;
        messageFee: number;
        referenceImageUrl?: string | null;
      };
    }[] = [];

    for (const item of items) {
      const prodRes = await client.query(
        `SELECT id, name, base_price, is_active FROM products WHERE id = $1`,
        [item.productId]
      );

      if (prodRes.rows.length === 0 || !prodRes.rows[0].is_active) {
        throw new Error(`Product not found or currently unavailable.`);
      }

      const product = prodRes.rows[0];
      let unitPrice = product.base_price;
      let messageFee = 0;

      // Price options (size / flavour modifiers)
      if (item.customisation?.selectedSize) {
        const sizeRes = await client.query(
          `SELECT price_modifier FROM product_options 
           WHERE product_id = $1 AND option_type = 'size' AND name = $2`,
          [product.id, item.customisation.selectedSize]
        );
        if (sizeRes.rows.length > 0) {
          unitPrice += sizeRes.rows[0].price_modifier;
        }
      }

      if (item.customisation?.selectedFlavour) {
        const flavourRes = await client.query(
          `SELECT price_modifier FROM product_options 
           WHERE product_id = $1 AND option_type = 'flavour' AND name = $2`,
          [product.id, item.customisation.selectedFlavour]
        );
        if (flavourRes.rows.length > 0) {
          unitPrice += flavourRes.rows[0].price_modifier;
        }
      }

      if (item.customisation?.customMessage && item.customisation.customMessage.trim().length > 0) {
        messageFee = CUSTOM_MESSAGE_FEE_CENTS;
        unitPrice += messageFee;
      }

      const itemTotalPrice = unitPrice * item.quantity;
      calculatedTotalAmount += itemTotalPrice;

      itemRecords.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotalPrice,
        customisation: item.customisation
          ? {
              selectedSize: item.customisation.selectedSize,
              selectedFlavour: item.customisation.selectedFlavour,
              customMessage: item.customisation.customMessage?.trim() || null,
              messageFee,
              referenceImageUrl: item.customisation.referenceImageUrl || null,
            }
          : undefined,
      });
    }

    // Step 6: Create the pending order with 10-minute hold expiration
    const orderReference = `CC-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const holdExpiresAt = new Date(Date.now() + HOLD_EXPIRATION_MINUTES * 60 * 1000);

    const orderRes = await client.query(
      `INSERT INTO orders (
        order_reference, user_id, pickup_date, pickup_slot_id, 
        status, total_amount, hold_expires_at, 
        customer_name, customer_email, customer_phone, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, order_reference, total_amount, hold_expires_at`,
      [
        orderReference,
        userId || null,
        pickupDate,
        slotRow.id,
        calculatedTotalAmount,
        holdExpiresAt,
        customerName.trim(),
        customerEmail.trim(),
        customerPhone.trim(),
      ]
    );

    const createdOrder = orderRes.rows[0];

    // Insert order items and customisations
    for (const itemRecord of itemRecords) {
      const orderItemRes = await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          createdOrder.id,
          itemRecord.productId,
          itemRecord.quantity,
          itemRecord.unitPrice,
          itemRecord.totalPrice,
        ]
      );

      const createdOrderItemId = orderItemRes.rows[0].id;

      if (itemRecord.customisation) {
        await client.query(
          `INSERT INTO order_customisations (
            order_item_id, selected_size, selected_flavour, 
            custom_message, message_fee, reference_image_url
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            createdOrderItemId,
            itemRecord.customisation.selectedSize || null,
            itemRecord.customisation.selectedFlavour || null,
            itemRecord.customisation.customMessage || null,
            itemRecord.customisation.messageFee,
            itemRecord.customisation.referenceImageUrl || null,
          ]
        );
      }
    }

    // Insert audit log
    await client.query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details, created_at)
       VALUES ('ORDER_HOLD_CREATED', 'order', $1, $2, $3, NOW())`,
      [
        createdOrder.id,
        userId || null,
        JSON.stringify({
          orderReference,
          totalAmount: calculatedTotalAmount,
          totalCakes,
          pickupDate,
          pickupSlotId,
          holdExpiresAt: holdExpiresAt.toISOString(),
        }),
      ]
    );

    // Step 7: Commit transaction
    await client.query("COMMIT");

    return {
      orderId: createdOrder.id,
      orderReference: createdOrder.order_reference,
      totalAmount: createdOrder.total_amount,
      holdExpiresAt: createdOrder.hold_expires_at.toISOString(),
      pickupDate,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
