"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Download,
  ShoppingBag,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function OrderConfirmationPage() {
  const params = useParams();
  const reference = params.reference as string;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${reference}`);
        if (!res.ok) throw new Error("Order not found");
        const data = await res.json();
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message || "Failed to load order receipt");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [reference]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <RefreshCw className="w-10 h-10 text-amber-600 animate-spin mx-auto mb-4" />
        <p className="text-bakery-800 font-medium">Generating order confirmation and collection QR...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-2xl font-bold text-bakery-950">Order Not Found</h2>
        <p className="text-sm text-bakery-600">{error || "Could not retrieve order details."}</p>
        <Link
          href="/menu"
          className="inline-block px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold"
        >
          Return to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Success Hero Card */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-bakery-200/90 shadow-bakery-soft text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle className="w-10 h-10" />
        </div>

        <span className="text-xs uppercase font-bold tracking-widest text-amber-700 block">
          Order Confirmed & Scheduled
        </span>

        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-bakery-950">
          Thank you, {order.customerName}!
        </h1>

        <p className="text-sm text-bakery-600 max-w-md mx-auto leading-relaxed">
          Your artisan creation has been entered into Chef Elena's baking schedule. Present your QR code upon arrival at the pickup window.
        </p>

        <div className="inline-block px-4 py-2 rounded-xl bg-bakery-100 border border-bakery-300 font-mono text-sm font-bold text-bakery-900">
          Order Reference: <span id="confirmation-order-ref" className="text-amber-800">{order.orderReference}</span>
        </div>
      </div>

      {/* Main Receipt & QR Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Pickup Schedule & Collection QR */}
        <div className="md:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-sm text-center space-y-6">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-bakery-500 block mb-1">
              Collection Pass
            </span>
            <h3 className="font-display font-bold text-xl text-bakery-950">
              Counter Scan QR Code
            </h3>
          </div>

          {/* Rendered SVG/PNG QR Code */}
          <div className="p-4 bg-bakery-50 rounded-2xl border border-bakery-200 inline-block shadow-inner">
            {order.qrCodeDataUrl ? (
              <img
                src={order.qrCodeDataUrl}
                alt={`QR Collection Code for ${order.orderReference}`}
                id="collection-qr-code-img"
                className="w-56 h-56 mx-auto rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-bakery-200 text-bakery-500">
                <QrCode className="w-12 h-12" />
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs text-bakery-600">
            <p className="font-medium text-bakery-900">
              Save or screenshot this pass for counter pickup.
            </p>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-left space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                <span>CakeCart Kitchen Studio</span>
              </div>
              <p className="text-[11px] text-amber-800 pl-5">
                23 Artisan Lane, Suite 4, Pickup Window
              </p>
            </div>
          </div>
        </div>

        {/* Right: Itemized Order Summary & Status */}
        <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-bakery-200">
            <h3 className="font-display font-bold text-xl text-bakery-950">
              Order Receipt
            </h3>
            <span
              id="order-status-badge"
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800 border border-green-200"
            >
              {order.status}
            </span>
          </div>

          {/* Schedule details */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-bakery-50 border border-bakery-200 text-xs">
            <div>
              <span className="text-bakery-500 block mb-0.5 font-semibold">Pickup Date</span>
              <span className="font-bold text-bakery-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-700" />
                {order.pickupDate}
              </span>
            </div>
            <div>
              <span className="text-bakery-500 block mb-0.5 font-semibold">Time Window</span>
              <span className="font-bold text-bakery-900 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                {order.pickupSlotDisplay}
              </span>
            </div>
          </div>

          {/* Item List */}
          <div className="space-y-4">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex gap-4 items-start pb-4 border-b border-bakery-100 last:border-b-0">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-16 h-16 rounded-xl object-cover border shrink-0 bg-bakery-50"
                  />
                )}
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-bold text-sm text-bakery-950">{item.productName}</p>
                  <p className="text-bakery-600">
                    Portion: {item.selectedSize} • Flavour: {item.selectedFlavour}
                  </p>
                  {item.customMessage && (
                    <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-950 italic font-serif">
                      "{item.customMessage}" (+$3.00)
                    </div>
                  )}
                  <p className="text-bakery-500">Qty: {item.quantity}</p>
                </div>
                <div className="font-bold text-sm text-bakery-950">
                  ${(item.totalPrice / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Total & Payment Method */}
          <div className="pt-4 border-t border-bakery-200 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-bakery-950">Total Paid</span>
              <span className="font-display text-2xl font-black text-amber-800">
                ${(order.totalAmount / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-bakery-500">
              Payment Status: Verified ({order.payment?.provider || "test_gateway"} • {order.payment?.paymentStatus || "PAID"})
            </p>
          </div>

          {/* Navigation Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href="/my-orders"
              className="flex-1 py-3 text-center rounded-xl bg-bakery-900 hover:bg-bakery-950 text-white font-medium text-xs transition-colors"
            >
              View in My Orders
            </Link>
            <Link
              href="/menu"
              className="flex-1 py-3 text-center rounded-xl border border-bakery-300 hover:bg-bakery-50 text-bakery-900 font-medium text-xs transition-colors"
            >
              Order Another Cake
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
