"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import {
  ShoppingBag,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    removeItem,
    updateQuantity,
    subtotalCents,
    messageFeesCents,
    totalCents,
    itemCount,
  } = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-bakery-100 flex items-center justify-center mx-auto text-amber-700">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-bakery-950">
          Your CakeCart is currently empty
        </h1>
        <p className="text-sm text-bakery-600 max-w-md mx-auto">
          Explore our artisan cakes, choose your portion size, customize a piped message, and reserve your oven slot.
        </p>
        <Link
          href="/menu"
          id="cart-browse-menu-btn"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all shadow-sm"
        >
          <span>Browse Artisan Cakes</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="border-b border-bakery-200 pb-5">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-bakery-950">
          Your Artisan Basket
        </h1>
        <p className="text-sm text-bakery-600 mt-1">
          Review your custom creations, message piping, and pickup details before checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {cart.items.map((item) => {
            const hasCustomMessage =
              item.customisation.customMessage &&
              item.customisation.customMessage.trim().length > 0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 border border-bakery-200/90 shadow-sm flex flex-col sm:flex-row gap-5 items-start justify-between"
              >
                {/* Thumbnail */}
                <div className="flex gap-4 items-start w-full sm:w-auto">
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-24 h-24 rounded-2xl object-cover shrink-0 bg-bakery-100 border"
                  />

                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-display font-bold text-lg text-bakery-950">
                      {item.productName}
                    </h3>

                    {/* Custom options */}
                    <div className="flex flex-wrap gap-2 text-xs text-bakery-600">
                      <span className="px-2 py-0.5 rounded-md bg-bakery-100 font-medium text-bakery-800">
                        {item.customisation.selectedSize}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-bakery-100 font-medium text-bakery-800">
                        {item.customisation.selectedFlavour}
                      </span>
                    </div>

                    {/* Custom Message Tag */}
                    {hasCustomMessage && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 mt-1">
                        <span className="font-bold text-[10px] uppercase text-amber-700 block">
                          Piped Message (+$3.00):
                        </span>
                        <span className="italic font-serif">
                          "{item.customisation.customMessage}"
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing & Stepper */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-bakery-100 gap-4">
                  <div className="text-right">
                    <span className="font-display text-xl font-bold text-bakery-950 block">
                      ${(item.totalItemPrice / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-bakery-500">
                      ${((item.totalItemPrice / item.quantity) / 100).toFixed(2)} each
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-bakery-300 rounded-lg overflow-hidden bg-bakery-50">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-sm font-bold text-bakery-700 hover:bg-bakery-200"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-xs font-bold text-bakery-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1 text-sm font-bold text-bakery-700 hover:bg-bakery-200"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-bakery-400 hover:text-red-600 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pickup Window Notice */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <p className="font-bold">Scheduled Pickup Time Window</p>
                <p className="text-amber-800">
                  {cart.pickupDate
                    ? `Date: ${cart.pickupDate} • Slot: ${cart.pickupSlotDisplay || "Standard"}`
                    : "No pickup date selected yet"}
                </p>
              </div>
            </div>
            <Link
              href="/menu"
              className="font-semibold text-amber-800 hover:underline shrink-0"
            >
              Add more cakes
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary & Checkout */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-bakery-soft space-y-6 lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-bold text-bakery-950 pb-4 border-b border-bakery-200">
            Order Summary
          </h2>

          <div className="space-y-3 text-sm text-bakery-700">
            <div className="flex justify-between">
              <span>Cakes Subtotal ({itemCount} {itemCount === 1 ? "cake" : "cakes"})</span>
              <span className="font-semibold text-bakery-950">
                ${(subtotalCents / 100).toFixed(2)}
              </span>
            </div>

            {messageFeesCents > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>Hand-Piped Message Fees</span>
                <span className="font-semibold">
                  +${(messageFeesCents / 100).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-xs text-bakery-500">
              <span>Pickup Window Collection</span>
              <span className="text-green-700 font-semibold">Free Pickup</span>
            </div>

            <div className="pt-4 border-t border-bakery-200 flex justify-between items-baseline">
              <span className="font-bold text-bakery-950">Final Total</span>
              <span className="font-display text-3xl font-extrabold text-amber-800">
                ${(totalCents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* 10-Minute Hold Reservation Promise */}
          <div className="p-3.5 rounded-xl bg-bakery-50 border border-bakery-200 flex items-start gap-2.5 text-xs text-bakery-600">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Proceeding to checkout places an atomic <strong>10-minute hold</strong> on the bakery oven capacity while you enter payment details.
            </span>
          </div>

          {/* Checkout CTA */}
          <button
            onClick={() => router.push("/checkout")}
            id="proceed-to-checkout-btn"
            className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
