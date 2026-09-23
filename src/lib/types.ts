export type UserRole = "customer" | "baker";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "BAKING"
  | "READY"
  | "COLLECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
}

export interface ProductOption {
  id: string;
  productId: string;
  optionType: "size" | "flavour";
  name: string;
  priceModifier: number; // in cents
  isDefault: boolean;
}

export interface DietaryTag {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface ProductWithDetails {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number; // in cents
  imageUrl: string;
  isActive: boolean;
  categories: { id: string; name: string; slug: string }[];
  sizes: ProductOption[];
  flavours: ProductOption[];
  dietaryTags: DietaryTag[];
}

export interface DailyCapacityInfo {
  id: string;
  bakeryDate: string; // YYYY-MM-DD
  maxCakes: number;
  reservedCakes: number;
  remainingCakes: number;
  isClosed: boolean;
  isAvailable: boolean;
}

export interface PickupSlotInfo {
  id: string;
  bakeryDate: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  reservedOrders: number;
  remainingOrders: number;
  isAvailable: boolean;
}

export interface CartCustomisation {
  selectedSize: string;
  selectedSizePriceModifier: number; // in cents
  selectedFlavour: string;
  selectedFlavourPriceModifier: number; // in cents
  customMessage: string; // max 40 chars
  messageFee: number; // in cents
  referenceImageUrl?: string | null;
}

export interface CartItem {
  id: string; // client generated UUID for the cart line
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string;
  basePrice: number; // in cents
  quantity: number;
  customisation: CartCustomisation;
  totalItemPrice: number; // (basePrice + sizeModifier + flavourModifier + messageFee) * quantity
}

export interface CartState {
  items: CartItem[];
  pickupDate: string | null; // YYYY-MM-DD
  pickupSlotId: string | null;
  pickupSlotDisplay?: string | null;
}

export interface OrderDetail {
  id: string;
  orderReference: string;
  userId?: string | null;
  pickupDate: string;
  pickupSlotId: string;
  pickupSlotDisplay: string;
  status: OrderStatus;
  totalAmount: number;
  holdExpiresAt?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    customisation?: {
      selectedSize?: string | null;
      selectedFlavour?: string | null;
      customMessage?: string | null;
      messageFee: number;
      referenceImageUrl?: string | null;
    } | null;
  }[];
  payment?: {
    id: string;
    paymentStatus: PaymentStatus;
    provider: string;
    amount: number;
    transactionId?: string | null;
  } | null;
}

export const MINIMUM_LEAD_TIME_HOURS = 48;
export const CANCELLATION_CUTOFF_HOURS = 24;
export const MAX_CUSTOM_MESSAGE_LENGTH = 40;
export const CUSTOM_MESSAGE_FEE_CENTS = 300; // $3.00
export const HOLD_EXPIRATION_MINUTES = 10;
