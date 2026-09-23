"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Cake, Lock, Mail, User, Phone, AlertCircle, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await register({ fullName, email, phone, password });
      router.push("/menu");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-600/10 flex items-center justify-center border border-amber-600/20 mx-auto text-amber-700">
          <Cake className="w-6 h-6" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-bakery-950">
          Join CakeCart
        </h1>
        <p className="text-xs text-bakery-600">
          Create an account to reserve limited daily oven slots and track custom cakes.
        </p>
      </div>

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
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                id="register-name-input"
                placeholder="Sarah Jenkins"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-bakery-50 border border-bakery-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-bakery-900"
              />
              <User className="w-4 h-4 text-bakery-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                id="register-email-input"
                placeholder="sarah@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bakery-50 border border-bakery-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-bakery-900"
              />
              <Mail className="w-4 h-4 text-bakery-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                id="register-phone-input"
                placeholder="+1 (555) 234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-bakery-50 border border-bakery-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-bakery-900"
              />
              <Phone className="w-4 h-4 text-bakery-400 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1">
              Password (Min 8 Characters)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                id="register-password-input"
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
            id="register-submit-btn"
            className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>{loading ? "Creating Account..." : "Create Customer Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-bakery-100 text-xs text-bakery-600">
          <span>Already have an account? </span>
          <Link href="/login" className="text-amber-700 font-semibold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
