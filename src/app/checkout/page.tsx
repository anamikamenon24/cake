"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import {
  CreditCard,
  Lock,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, totalCents, clearCart } = useCart();
  const { user } = useAuth();

  // Contact info
  const [customerName, setCustomerName] = useState(user?.fullName || "");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");

  // Hold reservation state
  const [orderHold, setOrderHold] = useState<{
    orderId: string;
    orderReference: string;
    totalAmount: number;
    holdExpiresAt: string;
  } | null>(null);
  const [isReservingHold, setIsReservingHold] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  // Countdown timer in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes

  // Payment form state
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("321");
  const [testOutcome, setTestOutcome] = useState<"success" | "fail">("success");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.fullName);
      if (!customerEmail) setCustomerEmail(user.email);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
    }
  }, [user]);

  // Hold timer countdown
  useEffect(() => {
    if (!orderHold) return;

    const interval = setInterval(() => {
      const expires = new Date(orderHold.holdExpiresAt).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((expires - now) / 1000));
      setSecondsRemaining(diffSecs);

      if (diffSecs <= 0) {
        clearInterval(interval);
        setHoldError("Your 10-minute capacity hold has expired. Please reserve again.");
        setOrderHold(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orderHold]);

  // Request atomic 10-min reservation hold
  const handleReserveHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setHoldError("Please fill in your name, email, and phone number.");
      return;
    }

    if (!cart.pickupDate || !cart.pickupSlotId) {
      setHoldError("Please return to the cart and pick a valid pickup date and slot.");
      return;
    }

    setIsReservingHold(true);
    setHoldError(null);

    try {
      const res = await fetch("/api/orders/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          pickupDate: cart.pickupDate,
          pickupSlotId: cart.pickupSlotId,
          items: cart.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            customisation: {
              selectedSize: it.customisation.selectedSize,
              selectedFlavour: it.customisation.selectedFlavour,
              customMessage: it.customisation.customMessage,
              referenceImageUrl: it.customisation.referenceImageUrl,
            },
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reserve oven capacity");
      }

      setOrderHold(data);
    } catch (err: any) {
      setHoldError(err.message);
    } finally {
      setIsReservingHold(false);
    }
  };

  // Process payment with idempotency key
  const handlePayment = async () => {
    if (!orderHold) return;

    setIsProcessingPayment(true);
    setPaymentError(null);

    // Generate unique client idempotency key for this attempt
    const idempotencyKey = `pay_idem_${orderHold.orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderHold.orderId,
          idempotencyKey,
          amount: orderHold.totalAmount,
          testOutcome,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Payment was declined by test gateway.");
      }

      // Clear cart
      clearCart();

      // Navigate to confirmation page
      router.push(`/order-confirmation/${orderHold.orderReference}`);
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (cart.items.length === 0 && !orderHold) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-600 mx-auto" />
        <h2 className="text-2xl font-bold text-bakery-950">Cart is Empty</h2>
        <p className="text-sm text-bakery-600">Please choose a cake from our menu to start your order.</p>
        <button
          onClick={() => router.push("/menu")}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold"
        >
          View Menu
        </button>
      </div>
    );
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Checkout Title */}
      <div className="border-b border-bakery-200 pb-4">
        <h1 className="font-display text-3xl font-extrabold text-bakery-950">
          Secure Artisan Checkout
        </h1>
        <p className="text-sm text-bakery-600 mt-1">
          Lock your oven capacity and finalize your pickup order.
        </p>
      </div>

      {/* 10-Minute Hold Status Banner */}
      {orderHold && (
        <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 animate-pulse shrink-0" />
            <div>
              <p className="font-bold text-sm">
                Oven Capacity Locked for Reference {orderHold.orderReference}
              </p>
              <p className="text-xs text-amber-100">
                Complete test payment before time expires to confirm your cake.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase font-semibold text-amber-100 block">
              Hold Expires In:
            </span>
            <span
              id="hold-timer-display"
              className="font-mono text-2xl font-black text-white"
            >
              {formatTimer(secondsRemaining)}
            </span>
          </div>
        </div>
      )}

      {holdError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-900 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{holdError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Contact info & Payment Simulation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Customer Contact Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-sm space-y-4">
            <h2 className="font-display text-xl font-bold text-bakery-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Pickup Customer Details</span>
            </h2>

            <form onSubmit={handleReserveHold} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  id="checkout-name-input"
                  placeholder="e.g. Sarah Jenkins"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={!!orderHold}
                  className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-4 py-2.5 text-sm text-bakery-900 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    id="checkout-email-input"
                    placeholder="sarah@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    disabled={!!orderHold}
                    className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-4 py-2.5 text-sm text-bakery-900 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    id="checkout-phone-input"
                    placeholder="+1 (555) 234-5678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={!!orderHold}
                    className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-4 py-2.5 text-sm text-bakery-900 disabled:opacity-60"
                  />
                </div>
              </div>

              {!orderHold && (
                <button
                  type="submit"
                  disabled={isReservingHold}
                  id="reserve-hold-btn"
                  className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                >
                  {isReservingHold ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Locking Oven Capacity (FOR UPDATE)...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Reserve Oven Hold & Proceed to Payment</span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Step 2: Payment Provider (Test Mode Gateway) */}
          <div
            className={`bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-sm space-y-6 transition-all ${
              !orderHold ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-bakery-200">
              <h2 className="font-display text-xl font-bold text-bakery-950 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Payment Provider (Test Mode)</span>
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
                Stripe Test Gateway
              </span>
            </div>

            {/* Test Simulation Toggles */}
            <div className="p-3.5 bg-bakery-50 rounded-2xl border border-bakery-200 text-xs space-y-2">
              <span className="font-bold text-bakery-900 block">
                Simulate Payment Result (QA / Test Mode):
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-bakery-800">
                  <input
                    type="radio"
                    name="testOutcome"
                    checked={testOutcome === "success"}
                    onChange={() => setTestOutcome("success")}
                    id="radio-payment-success"
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Successful Payment (200 OK)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-bakery-800">
                  <input
                    type="radio"
                    name="testOutcome"
                    checked={testOutcome === "fail"}
                    onChange={() => setTestOutcome("fail")}
                    id="radio-payment-fail"
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Simulate Card Decline / Failure</span>
                </label>
              </div>
            </div>

            {/* Card Inputs Mock */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
                  Card Number (Test Mode)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    id="card-number-input"
                    className="w-full bg-bakery-50 border border-bakery-300 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-bakery-900"
                  />
                  <CreditCard className="w-4 h-4 text-bakery-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
                    Expiration (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-4 py-2.5 text-sm font-mono text-bakery-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
                    Security Code (CVC)
                  </label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-4 py-2.5 text-sm font-mono text-bakery-900"
                  />
                </div>
              </div>
            </div>

            {paymentError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Pay Button */}
            <button
              type="button"
              onClick={handlePayment}
              disabled={isProcessingPayment || !orderHold || secondsRemaining <= 0}
              id="submit-payment-btn"
              className="w-full py-4 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessingPayment ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing Idempotent Payment...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>
                    Pay ${(orderHold ? orderHold.totalAmount / 100 : totalCents / 100).toFixed(2)} & Confirm Order
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Order Summary Preview */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-bakery-soft space-y-6 lg:sticky lg:top-28">
          <h3 className="font-display text-lg font-bold text-bakery-950 pb-3 border-b border-bakery-200">
            Order Review
          </h3>

          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {cart.items.map((it) => (
              <div key={it.id} className="flex gap-3 text-xs">
                <img
                  src={it.imageUrl}
                  alt={it.productName}
                  className="w-14 h-14 rounded-xl object-cover border"
                />
                <div className="flex-1">
                  <p className="font-bold text-bakery-950">{it.productName}</p>
                  <p className="text-bakery-500">
                    {it.quantity} × {it.customisation.selectedSize}
                  </p>
                  {it.customisation.customMessage && (
                    <p className="text-amber-800 italic mt-0.5">
                      "{it.customisation.customMessage}"
                    </p>
                  )}
                </div>
                <div className="font-bold text-bakery-950">
                  ${(it.totalItemPrice / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-bakery-200 space-y-2 text-xs text-bakery-600">
            <div className="flex justify-between">
              <span>Pickup Date</span>
              <span className="font-bold text-bakery-900">{cart.pickupDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Pickup Window</span>
              <span className="font-bold text-bakery-900">{cart.pickupSlotDisplay}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-bakery-200 flex justify-between items-baseline">
            <span className="font-bold text-bakery-950">Total Amount Due</span>
            <span className="font-display text-2xl font-black text-amber-800">
              ${(totalCents / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
