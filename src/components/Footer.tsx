import React from "react";
import Link from "next/link";
import { Cake, Clock, MapPin, Sparkles, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-bakery-950 text-bakery-100 border-t border-bakery-900 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1: Brand & Philosophy */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center border border-amber-500/30">
                <Cake className="w-5 h-5 text-amber-400" />
              </div>
              <span className="font-display font-bold text-2xl text-white">
                CakeCart
              </span>
            </div>
            <p className="text-sm text-bakery-300 leading-relaxed">
              Handcrafted artisan cakes made in small batches with strictly limited daily capacity, real French butter, and organic vanilla.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Small-batch baking since 2023</span>
            </div>
          </div>

          {/* Col 2: Lead Time Policy */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Bakery Policies
            </h4>
            <ul className="space-y-2.5 text-sm text-bakery-300">
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>48h Minimum Notice:</strong> All cakes are baked fresh to order.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>24h Cancellation Cutoff:</strong> Full refunds before 24h of pickup.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">
                  #
                </span>
                <span>
                  <strong>Daily Capacity:</strong> Maximum 8-10 cakes per day to guarantee quality.
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Browse & Order
            </h4>
            <ul className="space-y-2 text-sm text-bakery-300">
              <li>
                <Link href="/menu" className="hover:text-white transition-colors">
                  Full Artisan Menu
                </Link>
              </li>
              <li>
                <Link href="/menu?dietary=eggless" className="hover:text-white transition-colors">
                  Eggless Cakes
                </Link>
              </li>
              <li>
                <Link href="/menu?dietary=gluten-free" className="hover:text-white transition-colors">
                  Gluten-Free Cakes
                </Link>
              </li>
              <li>
                <Link href="/menu?category=celebration" className="hover:text-white transition-colors">
                  Celebration Tier Cakes
                </Link>
              </li>
              <li>
                <Link href="/baker" className="text-xs text-amber-400/80 hover:text-amber-300">
                  Staff / Baker Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Studio Location */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Kitchen Studio
            </h4>
            <div className="space-y-2 text-sm text-bakery-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  CakeCart Kitchen Studio<br />
                  23 Artisan Lane, Suite 4<br />
                  Order Pickup Window
                </span>
              </div>
              <p className="text-xs text-bakery-400 pt-2">
                Pickup Hours: Tue - Sun: 10:00 AM – 6:00 PM<br />
                Closed on Mondays for deep kitchen resting.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-bakery-900 flex flex-col sm:flex-row items-center justify-between text-xs text-bakery-400">
          <p>© {new Date().getFullYear()} CakeCart Micro-Bakery. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">
            Powered by Next.js, Neon Serverless PostgreSQL & Drizzle ORM
          </p>
        </div>
      </div>
    </footer>
  );
}
