"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Cake, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password);
      if (user.role === "baker") {
        router.push("/baker");
      } else {
        router.push("/menu");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoBaker = () => {
    setEmail("baker@cakecart.com");
    setPassword("BakeryPass123!");
  };

  const fillDemoCustomer = () => {
    setEmail("customer@cakecart.com");
    setPassword("BakeryPass123!");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-600/10 flex items-center justify-center border border-amber-600/20 mx-auto text-amber-700">
          <Cake className="w-6 h-6" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-bakery-950">
          Sign In to CakeCart
        </h1>
        <p className="text-xs text-bakery-600">
          Access your pickup schedule, order history, or bakery dashboard.
        </p>
      </div>

      {/* 1-Click Demo Login Shortcuts */}
      <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs space-y-2.5">
        <span className="font-bold text-amber-900 block flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          <span>Quick 1-Click Demo Accounts</span>
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={fillDemoBaker}
            id="quick-login-baker-btn"
            className="p-2 bg-white rounded-xl border border-amber-300 font-semibold text-amber-900 hover:bg-amber-100/60 transition-colors text-left"
          >
            <span className="block font-bold">Chef / Baker</span>
            <span className="text-[10px] text-amber-700 block">baker@cakecart.com</span>
          </button>
          <button
            type="button"
            onClick={fillDemoCustomer}
            id="quick-login-customer-btn"
            className="p-2 bg-white rounded-xl border border-amber-300 font-semibold text-amber-900 hover:bg-amber-100/60 transition-colors text-left"
          >
            <span className="block font-bold">Customer</span>
            <span className="text-[10px] text-amber-700 block">customer@cakecart.com</span>
          </button>
        </div>
      </div>

      {/* Main Login Form */}
      <div className="bg-white rounded-3xl p-8 border border-bakery-200/90 shadow-bakery-soft space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                id="login-email-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bakery-50 border border-bakery-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-bakery-900"
              />
              <Mail className="w-4 h-4 text-bakery-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                id="login-password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bakery-50 border border-bakery-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-bakery-900"
              />
              <Lock className="w-4 h-4 text-bakery-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            id="login-submit-btn"
            className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>{loading ? "Authenticating..." : "Sign In to CakeCart"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-bakery-100 text-xs text-bakery-600">
          <span>Don't have an account yet? </span>
          <Link href="/register" className="text-amber-700 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
