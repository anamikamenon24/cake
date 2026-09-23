"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldAlert,
  Calendar,
  Clock,
  CheckCircle2,
  ChefHat,
  Search,
  Lock,
  RefreshCw,
  AlertCircle,
  QrCode,
  PackageCheck,
  Ban,
} from "lucide-react";

export default function BakerDashboardPage() {
  const { user, isLoading } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [capacities, setCapacities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterDate, setFilterDate] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Capacity adjustment form state
  const [targetCapDate, setTargetCapDate] = useState<string>("");
  const [targetMaxCakes, setTargetMaxCakes] = useState<number>(8);
  const [targetIsClosed, setTargetIsClosed] = useState<boolean>(false);
  const [capSaveMsg, setCapSaveMsg] = useState<string | null>(null);
  const [isSavingCap, setIsSavingCap] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterDate !== "all") params.set("date", filterDate);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const [ordersRes, capRes] = await Promise.all([
        fetch(`/api/baker/orders?${params.toString()}`),
        fetch(`/api/capacity`),
      ]);

      if (!ordersRes.ok) {
        const data = await ordersRes.json();
        throw new Error(data.error || "Failed to load orders");
      }

      const ordersData = await ordersRes.json();
      setOrders(ordersData.orders || []);

      if (capRes.ok) {
        const capData = await capRes.json();
        setCapacities(capData.capacities || []);
        if (!targetCapDate && capData.capacities?.length > 0) {
          setTargetCapDate(capData.capacities[0].bakeryDate);
          setTargetMaxCakes(capData.capacities[0].maxCakes);
          setTargetIsClosed(capData.capacities[0].isClosed);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (user && user.role === "baker") {
        fetchDashboardData();
      } else {
        setLoading(false);
      }
    }
  }, [user, isLoading, filterDate, filterStatus]);

  // Update order status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/baker/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");

      // Refresh list
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save daily capacity
  const handleSaveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCap(true);
    setCapSaveMsg(null);

    try {
      const res = await fetch("/api/baker/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bakeryDate: targetCapDate,
          maxCakes: targetMaxCakes,
          isClosed: targetIsClosed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update capacity");

      setCapSaveMsg("Oven capacity updated successfully!");
      fetchDashboardData();
      setTimeout(() => setCapSaveMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingCap(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-bakery-700">Verifying baker credentials...</p>
      </div>
    );
  }

  // Guard: Unauthorized if not baker
  if (!user || user.role !== "baker") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-bakery-950">Baker Dashboard Access Required</h2>
        <p className="text-sm text-bakery-600">
          This portal is restricted to authorized bakery staff. Please log in with a Baker staff account.
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            id="baker-login-redirect-btn"
            className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold inline-block"
          >
            Sign In with Demo Baker Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-bakery-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-2">
            <ChefHat className="w-4 h-4 text-amber-700" />
            <span>Kitchen Management Portal</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-bakery-950">
            Baker Operations Dashboard
          </h1>
          <p className="text-sm text-bakery-600 mt-0.5">
            Logged in as Chef Elena ({user.email}) • Manage production pipeline and daily oven limits.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bakery-100 hover:bg-bakery-200 text-bakery-800 text-xs font-bold transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Pipeline</span>
        </button>
      </div>

      {/* Capacity & Date Closure Manager */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-sm space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-bakery-950">
            Daily Capacity & Date Closure Planner
          </h2>
          <p className="text-xs text-bakery-600 mt-1">
            Override maximum oven limits or toggle closed dates for kitchen maintenance.
          </p>
        </div>

        <form onSubmit={handleSaveCapacity} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
              Select Bakery Date
            </label>
            <select
              value={targetCapDate}
              onChange={(e) => {
                const d = e.target.value;
                setTargetCapDate(d);
                const found = capacities.find((c) => c.bakeryDate === d);
                if (found) {
                  setTargetMaxCakes(found.maxCakes);
                  setTargetIsClosed(found.isClosed);
                }
              }}
              id="baker-cap-date-select"
              className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-3 py-2.5 text-sm text-bakery-900"
            >
              {capacities.map((c) => (
                <option key={c.bakeryDate} value={c.bakeryDate}>
                  {c.bakeryDate} ({c.reservedCakes}/{c.maxCakes} reserved) {c.isClosed ? "[CLOSED]" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
              Max Cakes Limit
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={targetMaxCakes}
              onChange={(e) => setTargetMaxCakes(parseInt(e.target.value, 10))}
              id="baker-max-cakes-input"
              className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-3 py-2.5 text-sm text-bakery-900"
            />
          </div>

          <div className="flex items-center gap-3 h-10">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-bakery-900">
              <input
                type="checkbox"
                checked={targetIsClosed}
                onChange={(e) => setTargetIsClosed(e.target.checked)}
                id="baker-close-date-checkbox"
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <span>Close Date to Orders</span>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSavingCap}
              id="baker-save-cap-btn"
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              {isSavingCap ? "Updating..." : "Update Capacity / Close Date"}
            </button>
          </div>
        </form>

        {capSaveMsg && (
          <p className="text-xs font-bold text-green-700 bg-green-50 p-2.5 rounded-xl border border-green-200">
            {capSaveMsg}
          </p>
        )}
      </div>

      {/* Orders Filter & Pipeline Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-bakery-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-bakery-100">
          <div>
            <h2 className="font-display text-xl font-bold text-bakery-950">
              Pickup Production Pipeline ({orders.length} orders)
            </h2>
            <p className="text-xs text-bakery-600">
              Advance orders through BAKING, READY for pickup, and COLLECTED.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by date */}
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              id="baker-filter-date-select"
              className="bg-bakery-50 border border-bakery-300 rounded-xl px-3 py-2 text-xs font-medium text-bakery-900"
            >
              <option value="all">All Pickup Dates</option>
              {capacities.map((c) => (
                <option key={c.bakeryDate} value={c.bakeryDate}>
                  {c.bakeryDate}
                </option>
              ))}
            </select>

            {/* Filter by status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              id="baker-filter-status-select"
              className="bg-bakery-50 border border-bakery-300 rounded-xl px-3 py-2 text-xs font-medium text-bakery-900"
            >
              <option value="all">All Statuses</option>
              <option value="CONFIRMED">CONFIRMED (Queued)</option>
              <option value="BAKING">BAKING (In Oven)</option>
              <option value="READY">READY (At Pickup Window)</option>
              <option value="COLLECTED">COLLECTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            {/* Reference search / QR code lookup */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search order ref or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchDashboardData()}
                id="baker-search-input"
                className="bg-bakery-50 border border-bakery-300 rounded-xl pl-8 pr-3 py-2 text-xs text-bakery-900 w-56"
              />
              <Search className="w-3.5 h-3.5 text-bakery-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="text-center py-12 text-bakery-500 text-sm">
            No orders match the selected date and status filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-6 rounded-2xl border border-bakery-200 bg-bakery-50/40 space-y-4 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bakery-200/60 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-extrabold text-bakery-950">
                      {ord.orderReference}
                    </span>
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                        ord.status === "CONFIRMED"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : ord.status === "BAKING"
                          ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                          : ord.status === "READY"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : ord.status === "COLLECTED"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-red-100 text-red-800 border-red-200"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-bakery-600">
                    <span className="flex items-center gap-1 font-bold text-bakery-900">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      {ord.pickupDate}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-bakery-900">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      {ord.pickupSlotDisplay}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="text-xs text-bakery-700 flex flex-wrap gap-x-6 gap-y-1">
                  <span>Customer: <strong>{ord.customerName}</strong></span>
                  <span>Email: <strong>{ord.customerEmail}</strong></span>
                  <span>Phone: <strong>{ord.customerPhone}</strong></span>
                  <span>Total Paid: <strong>${(ord.totalAmount / 100).toFixed(2)}</strong></span>
                </div>

                {/* Cake items and customisations */}
                <div className="space-y-3 pt-2">
                  {ord.items.map((it: any) => (
                    <div
                      key={it.id}
                      className="p-3 bg-white rounded-xl border border-bakery-200 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center font-bold text-bakery-950">
                        <span>{it.quantity} × {it.productName}</span>
                        <span>${(it.totalPrice / 100).toFixed(2)}</span>
                      </div>
                      <p className="text-bakery-600">
                        Portion: {it.selectedSize} • Flavour: {it.selectedFlavour}
                      </p>
                      {it.customMessage && (
                        <div className="p-2 rounded bg-amber-50 text-amber-950 border border-amber-200 font-serif italic text-xs">
                          Piped message: "{it.customMessage}"
                        </div>
                      )}
                      {it.referenceImageUrl && (
                        <div className="pt-1 flex items-center gap-2">
                          <img
                            src={it.referenceImageUrl}
                            alt="Reference"
                            className="w-10 h-10 rounded object-cover border"
                          />
                          <span className="text-[11px] text-bakery-500">Customer attached design reference</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Status Transition Action Buttons */}
                <div className="pt-3 border-t border-bakery-200 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-bakery-500">
                    Status Actions for Baker:
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {ord.status === "CONFIRMED" && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, "BAKING")}
                        id={`mark-baking-btn-${ord.orderReference}`}
                        className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Start Baking</span>
                      </button>
                    )}

                    {ord.status === "BAKING" && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, "READY")}
                        id={`mark-ready-btn-${ord.orderReference}`}
                        className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Mark Ready for Pickup</span>
                      </button>
                    )}

                    {ord.status === "READY" && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, "COLLECTED")}
                        id={`mark-collected-btn-${ord.orderReference}`}
                        className="px-4 py-1.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Collected</span>
                      </button>
                    )}

                    {ord.status !== "CANCELLED" && ord.status !== "COLLECTED" && (
                      <button
                        onClick={() => {
                          if (confirm("Cancel and refund order?")) {
                            handleUpdateStatus(ord.id, "CANCELLED");
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
