import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  time,
  timestamp,
  jsonb,
  check,
  uniqueIndex,
  index,
  primaryKey
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ----------------------------------------------------
// 1. Users Table
// ----------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 20 }).default("customer").notNull(), // 'customer' | 'baker'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------
// 2. Categories Table
// ----------------------------------------------------
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  displayOrder: integer("display_order").default(0).notNull(),
});

// ----------------------------------------------------
// 3. Products Table (Cakes)
// ----------------------------------------------------
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  basePrice: integer("base_price").notNull(), // Integer minor units (cents)
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------
// 4. Product Categories Join Table
// ----------------------------------------------------
export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.categoryId] }),
  })
);

// ----------------------------------------------------
// 5. Product Options (Sizes, Flavours)
// ----------------------------------------------------
export const productOptions = pgTable("product_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  optionType: varchar("option_type", { length: 50 }).notNull(), // 'size' | 'flavour'
  name: varchar("name", { length: 100 }).notNull(),
  priceModifier: integer("price_modifier").default(0).notNull(), // Minor units (cents)
  isDefault: boolean("is_default").default(false).notNull(),
});

// ----------------------------------------------------
// 6. Dietary Tags (Eggless, Gluten-Free, Nut-Free)
// ----------------------------------------------------
export const dietaryTags = pgTable("dietary_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
});

// ----------------------------------------------------
// 7. Product Dietary Tags Join Table
// ----------------------------------------------------
export const productDietaryTags = pgTable(
  "product_dietary_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    dietaryTagId: uuid("dietary_tag_id")
      .notNull()
      .references(() => dietaryTags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.dietaryTagId] }),
  })
);

// ----------------------------------------------------
// 8. Daily Capacity Table
// ----------------------------------------------------
export const dailyCapacity = pgTable(
  "daily_capacity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bakeryDate: date("bakery_date").notNull(),
    maxCakes: integer("max_cakes").notNull(),
    reservedCakes: integer("reserved_cakes").default(0).notNull(),
    isClosed: boolean("is_closed").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueDate: uniqueIndex("daily_capacity_date_idx").on(table.bakeryDate),
    capacityCheck: check(
      "daily_capacity_reserved_check",
      sql`${table.reservedCakes} <= ${table.maxCakes}`
    ),
    nonNegativeCheck: check(
      "daily_capacity_non_negative_check",
      sql`${table.reservedCakes} >= 0`
    ),
  })
);

// ----------------------------------------------------
// 9. Pickup Slots Table
// ----------------------------------------------------
export const pickupSlots = pgTable(
  "pickup_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bakeryDate: date("bakery_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    maxOrders: integer("max_orders").default(5).notNull(),
    reservedOrders: integer("reserved_orders").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slotCheck: check(
      "pickup_slot_reserved_check",
      sql`${table.reservedOrders} <= ${table.maxOrders}`
    ),
    slotNonNegative: check(
      "pickup_slot_non_negative_check",
      sql`${table.reservedOrders} >= 0`
    ),
    dateSlotIdx: index("pickup_slots_date_idx").on(table.bakeryDate),
  })
);

// ----------------------------------------------------
// 10. Orders Table
// ----------------------------------------------------
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderReference: varchar("order_reference", { length: 32 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  pickupDate: date("pickup_date").notNull(),
  pickupSlotId: uuid("pickup_slot_id")
    .notNull()
    .references(() => pickupSlots.id),
  // Status: PENDING, CONFIRMED, BAKING, READY, COLLECTED, CANCELLED, EXPIRED, REFUNDED
  status: varchar("status", { length: 30 }).default("PENDING").notNull(),
  totalAmount: integer("total_amount").notNull(), // Minor units (cents)
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  dateIdx: index("orders_pickup_date_idx").on(table.pickupDate),
  userIdx: index("orders_user_idx").on(table.userId),
  statusIdx: index("orders_status_idx").on(table.status),
}));

// ----------------------------------------------------
// 11. Order Items Table
// ----------------------------------------------------
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: integer("unit_price").notNull(), // Minor units (cents)
  totalPrice: integer("total_price").notNull(), // Minor units (cents)
});

// ----------------------------------------------------
// 12. Order Customisations Table
// ----------------------------------------------------
export const orderCustomisations = pgTable(
  "order_customisations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    selectedSize: varchar("selected_size", { length: 100 }),
    selectedFlavour: varchar("selected_flavour", { length: 100 }),
    customMessage: varchar("custom_message", { length: 40 }),
    messageFee: integer("message_fee").default(0).notNull(), // Minor units (cents)
    referenceImageUrl: text("reference_image_url"),
  },
  (table) => ({
    messageLengthCheck: check(
      "custom_message_length_check",
      sql`char_length(${table.customMessage}) <= 40`
    ),
  })
);

// ----------------------------------------------------
// 13. Payments Table
// ----------------------------------------------------
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),
  provider: varchar("provider", { length: 50 }).default("test_gateway").notNull(),
  // Payment status: PENDING, PAID, FAILED, REFUNDED
  paymentStatus: varchar("payment_status", { length: 30 }).default("PENDING").notNull(),
  amount: integer("amount").notNull(), // Minor units (cents)
  transactionId: varchar("transaction_id", { length: 255 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------
// 14. Audit Logs Table
// ----------------------------------------------------
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
