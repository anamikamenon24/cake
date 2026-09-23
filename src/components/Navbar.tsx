"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Cake, ShoppingBag, User, LogOut, ShieldAlert, Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-bakery-200 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-amber-600/10 flex items-center justify-center border border-amber-600/20 group-hover:scale-105 transition-transform duration-200 shadow-sm">
              <Cake className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <span className="font-display font-bold text-2xl text-bakery-950 tracking-tight block">
                CakeCart
              </span>
              <span className="text-[10px] uppercase tracking-widest text-bakery-500 font-semibold block -mt-1">
                Artisan Micro-Bakery
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/menu"
              className={`text-sm font-medium transition-colors ${
                pathname === "/menu"
                  ? "text-amber-700 font-semibold"
                  : "text-bakery-800 hover:text-amber-700"
              }`}
            >
              Artisan Menu
            </Link>
            <Link
              href="/#lead-time"
              className="text-sm font-medium text-bakery-800 hover:text-amber-700 transition-colors"
            >
              Lead Time & Slots
            </Link>
            {user && (
              <Link
                href="/my-orders"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/my-orders"
                    ? "text-amber-700 font-semibold"
                    : "text-bakery-800 hover:text-amber-700"
                }`}
              >
                My Orders
              </Link>
            )}
            {user?.role === "baker" && (
              <Link
                href="/baker"
                className={`text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                  pathname === "/baker"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Baker Dashboard
              </Link>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Cart Icon Button */}
            <Link
              href="/cart"
              id="nav-cart-btn"
              className="relative p-2.5 rounded-xl text-bakery-800 hover:bg-bakery-100 transition-colors"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 text-bakery-800" />
              {itemCount > 0 && (
                <span
                  id="nav-cart-count"
                  className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-fade-in shadow-sm"
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Auth Dropdown / Buttons */}
            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-bakery-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-bakery-200 flex items-center justify-center text-bakery-800 text-sm font-semibold">
                    {user.fullName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-bakery-900 truncate max-w-[130px]">
                    {user.fullName}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  title="Log out"
                  className="p-2 text-bakery-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-bakery-200">
                <Link
                  href="/login"
                  className="text-sm font-medium px-4 py-2 rounded-xl text-bakery-800 hover:bg-bakery-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm"
                >
                  Join CakeCart
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/cart"
              className="relative p-2 rounded-lg text-bakery-800 hover:bg-bakery-100"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-bakery-800 hover:bg-bakery-100"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-bakery-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <Link
            href="/menu"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-bakery-900"
          >
            Artisan Menu
          </Link>
          <Link
            href="/#lead-time"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-bakery-900"
          >
            Lead Time & Slots
          </Link>
          {user && (
            <Link
              href="/my-orders"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-bakery-900"
            >
              My Orders
            </Link>
          )}
          {user?.role === "baker" && (
            <Link
              href="/baker"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-semibold text-amber-800 bg-amber-50 px-3 rounded-lg"
            >
              Baker Dashboard
            </Link>
          )}

          <div className="pt-4 border-t border-bakery-200">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-bakery-950">{user.fullName}</p>
                  <p className="text-xs text-bakery-500">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-sm font-medium border border-bakery-300 rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-sm font-medium bg-amber-600 text-white rounded-xl"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
