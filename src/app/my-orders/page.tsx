"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Package,
  Calendar,
  Clock,
  QrCode,
  AlertCircle,
  XCircle,
  CheckCircle,
  RefreshCw,
  Info,
} from "lucide-react";

export default function MyOrdersPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/my-orders");
      if (res.status === 401) {
        setOrders([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load your orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        fetchOrders();
      } else {
        setLoading(false);
      }
    }
  }, [user, isLoading]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you wish to cancel this order? Capacity will be immediately released.")) {
      return;
    }

    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason: cancelReason || "Customer requested cancellation online",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel order");
      }

      setCancellingOrderId(null);
      setCancelReason("");
      fetchOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-bakery-700">Loading your bakery orders...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Package className="w-12 h-12 text-amber-600 mx-auto" />
        <h2 className="text-2xl font-bold text-bakery-950">Sign In to View Orders</h2>
        <p className="text-sm text-bakery-600">
          Sign in to your CakeCart account to see your upcoming pickups and collection QR passes.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/login"
            className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-2.5 border border-bakery-300 rounded-xl text-sm font-semibold text-bakery-900"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "BAKING":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "READY":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "COLLECTED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
      case "EXPIRED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-bakery-950">
          My Bakery Orders
        </h1>
        <p className="text-sm text-bakery-600 mt-1">
          Track production progress, view pickup QR codes, or cancel eligible orders.
        </p>
      </div>

      {/* Cancellation Policy Reminder */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <span>
          <strong>24-Hour Cutoff Policy:</strong> To protect small-batch ingredients, orders can only be cancelled up to 24 hours prior to scheduled pickup.
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-bakery-200/90 shadow-sm space-y-4">
          <Package className="w-12 h-12 text-bakery-400 mx-auto" />
          <h3 className="font-bold text-lg text-bakery-950">No orders placed yet</h3>
          <p className="text-sm text-bakery-600 max-w-sm mx-auto">
            You don't have any active or past cake orders associated with {user.email}.
          </p>
          <Link
            href="/menu"
            className="inline-block px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold"
          >
            Explore Menu & Order
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-bakery-soft space-y-6"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-bakery-100 gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-bakery-950">
                      {order.orderReference}
                    </span>
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <span className="text-xs text-bakery-500 block mt-1">
                    Booked on {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/order-confirmation/${order.orderReference}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-bakery-300 hover:bg-bakery-50 text-xs font-semibold text-bakery-800 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-700" />
                    <span>View Pickup QR</span>
                  </Link>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-bakery-50 border border-bakery-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-bakery-500 font-semibold block">Pickup Date</span>
                    <span className="font-bold text-bakery-900">{order.pickupDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-bakery-500 font-semibold block">Time Window</span>
                    <span className="font-bold text-bakery-900">{order.pickupSlotDisplay}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {order.items.map((it: any) => (
                  <div key={it.id} className="flex justify-between items-start text-xs">
                    <div>
                      <p className="font-bold text-sm text-bakery-950">
                        {it.productName} × {it.quantity}
                      </p>
                      <p className="text-bakery-600">
                        {it.selectedSize} • {it.selectedFlavour}
                      </p>
                      {it.customMessage && (
                        <p className="text-amber-800 italic font-serif mt-0.5">
                          "{it.customMessage}"
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-sm text-bakery-950">
                      ${(it.totalPrice / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer: Total & Cancellation Option */}
              <div className="pt-4 border-t border-bakery-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-bakery-500 block">Total Investment</span>
                  <span className="font-display text-2xl font-black text-amber-800">
                    ${(order.totalAmount / 100).toFixed(2)}
                  </span>
                </div>

                {/* Cancellation trigger button or status note */}
                <div>
                  {order.status === "CANCELLED" ? (
                    <span className="text-xs text-red-600 font-semibold italic">
                      Order Cancelled ({order.cancellationReason || "Online"})
                    </span>
                  ) : order.isEligibleForCancellation ? (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      id={`cancel-order-btn-${order.orderReference}`}
                      className="px-4 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancel Order (Capacity Released)</span>
                    </button>
                  ) : (
                    <span
                      title="Cancellations are locked 24 hours prior to pickup"
                      className="text-xs text-bakery-400 font-medium italic block"
                    >
                      Within 24h cutoff window (Locked for oven prep)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
