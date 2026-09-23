import React from "react";
import Link from "next/link";
import { pool } from "@/db";
import { CakeCard } from "@/components/CakeCard";
import { Sparkles, Calendar, Clock, ShieldCheck, ArrowRight, Heart } from "lucide-react";
import { MINIMUM_LEAD_TIME_HOURS } from "@/lib/types";

// Dynamic database fetch for live data on every request
export const dynamic = "force-dynamic";

async function getHomePageData() {
  let client: any = null;
  try {
    const { ensureDatabaseInitialized } = await import("@/db/init");
    await ensureDatabaseInitialized().catch(console.error);

    client = await pool.connect();
    // 1. Fetch featured cakes
    const cakesRes = await client.query(`
      SELECT 
        p.id, p.name, p.slug, p.description, p.base_price, p.image_url,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', dt.id, 'name', dt.name, 'slug', dt.slug))
          FILTER (WHERE dt.id IS NOT NULL), '[]'
        ) AS dietary_tags
      FROM products p
      LEFT JOIN product_dietary_tags pdt ON p.id = pdt.product_id
      LEFT JOIN dietary_tags dt ON pdt.dietary_tag_id = dt.id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.created_at ASC
      LIMIT 6
    `);

    // 2. Fetch options
    const optionsRes = await client.query(`
      SELECT product_id, option_type, name, price_modifier 
      FROM product_options 
      WHERE option_type = 'size'
    `);

    const sizesByProduct: Record<string, any[]> = {};
    for (const opt of optionsRes.rows) {
      if (!sizesByProduct[opt.product_id]) sizesByProduct[opt.product_id] = [];
      sizesByProduct[opt.product_id].push({
        name: opt.name,
        priceModifier: opt.price_modifier,
      });
    }

    const cakes = cakesRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      basePrice: row.base_price,
      imageUrl: row.image_url,
      dietaryTags: typeof row.dietary_tags === "string" ? JSON.parse(row.dietary_tags) : row.dietary_tags,
      sizes: sizesByProduct[row.id] || [],
    }));

    // 3. Fetch next 7 days of daily capacity
    const capacityRes = await client.query(`
      SELECT bakery_date, max_cakes, reserved_cakes, is_closed 
      FROM daily_capacity 
      WHERE bakery_date >= CURRENT_DATE 
      ORDER BY bakery_date ASC 
      LIMIT 7
    `);

    const now = new Date();
    const minNoticeDate = new Date(now.getTime() + MINIMUM_LEAD_TIME_HOURS * 60 * 60 * 1000);

    const capacities = capacityRes.rows.map((row) => {
      const dateString = row.bakery_date instanceof Date
        ? row.bakery_date.toISOString().split("T")[0]
        : String(row.bakery_date).split("T")[0];

      const remainingCakes = Math.max(0, row.max_cakes - row.reserved_cakes);
      const dayEnd = new Date(`${dateString}T23:59:59Z`);
      const meetsLeadTime = dayEnd >= minNoticeDate;

      return {
        date: dateString,
        maxCakes: row.max_cakes,
        reservedCakes: row.reserved_cakes,
        remainingCakes,
        isClosed: row.is_closed,
        meetsLeadTime,
      };
    });

    return { cakes, capacities };
  } catch (err) {
    console.error("Warning in getHomePageData, using fallback data:", err);
    // Graceful fallback so container never 500s on cold boot
    const today = new Date();
    const fallbackCapacities = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      return {
        date: dateStr,
        maxCakes: 8,
        reservedCakes: 0,
        remainingCakes: 8,
        isClosed: false,
        meetsLeadTime: i >= 2,
      };
    });

    return {
      cakes: [
        {
          id: "cake-1",
          name: "Belgian Dark Chocolate Truffle Cake",
          slug: "dark-chocolate-truffle",
          description: "Intense 70% Callebaut dark chocolate ganache layered between velvety fudge sponge.",
          basePrice: 4800,
          imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop",
          dietaryTags: [{ id: "tag-1", name: "Nut-Free", slug: "nut-free" }],
          sizes: [{ name: '6" Petit', priceModifier: 0 }, { name: '8" Classic', priceModifier: 1500 }],
        },
        {
          id: "cake-2",
          name: "Tahitian Vanilla & Wild Berry Chiffon",
          slug: "vanilla-berry-chiffon",
          description: "Cloud-light vanilla bean chiffon layered with house-simmered blackberry and raspberry compote.",
          basePrice: 4500,
          imageUrl: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=800&auto=format&fit=crop",
          dietaryTags: [{ id: "tag-2", name: "Eggless", slug: "eggless" }],
          sizes: [{ name: '6" Petit', priceModifier: 0 }, { name: '8" Classic', priceModifier: 1500 }],
        }
      ],
      capacities: fallbackCapacities,
    };
  } finally {
    if (client) {
      try {
        client.release();
      } catch {
        // ignore
      }
    }
  }
}

export default async function HomePage() {
  const { cakes, capacities } = await getHomePageData();

  return (
    <div className="space-y-24 pb-16">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 lg:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/50 text-amber-900 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Strictly Capped Daily Production</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-bakery-950 tracking-tight leading-[1.12]">
                Handcrafted celebration cakes, baked fresh to your exact day.
              </h1>

              <p className="text-lg text-bakery-700 leading-relaxed max-w-2xl">
                We bake no more than 8 to 10 artisan cakes per day using authentic French cultured butter and hand-simmered berry compotes. Pick your flavour, customize your piped message, and reserve your pickup slot.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  href="/menu"
                  id="hero-explore-menu-btn"
                  className="px-8 py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-base transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 inline-flex items-center gap-2"
                >
                  <span>Explore Artisan Menu</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#capacity-overview"
                  className="px-6 py-4 rounded-2xl bg-white hover:bg-bakery-100 text-bakery-900 font-semibold text-base border border-bakery-300 transition-all shadow-sm"
                >
                  View Live Oven Capacity
                </a>
              </div>

              {/* Guarantee highlights */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-bakery-200/80">
                <div>
                  <div className="font-display text-2xl font-bold text-bakery-950">
                    48 Hours
                  </div>
                  <div className="text-xs text-bakery-600 font-medium mt-0.5">
                    Slow artisan lead time
                  </div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-bakery-950">
                    Max 8/Day
                  </div>
                  <div className="text-xs text-bakery-600 font-medium mt-0.5">
                    Strict capacity cap
                  </div>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-bakery-950">
                    40 Chars
                  </div>
                  <div className="text-xs text-bakery-600 font-medium mt-0.5">
                    Custom message piping
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative blob backdrop */}
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-200 to-orange-100 rounded-3xl blur-2xl opacity-60 transform -rotate-3" />

                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                  <img
                    src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1000&auto=format&fit=crop"
                    alt="Belgian Dark Chocolate Truffle Cake"
                    className="w-full h-[420px] object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-bakery-950 via-bakery-950/80 to-transparent text-white">
                    <span className="text-xs uppercase tracking-widest text-amber-300 font-bold block mb-1">
                      Chef Elena's Signature
                    </span>
                    <h3 className="font-display text-2xl font-bold">
                      Belgian Dark Chocolate Truffle
                    </h3>
                    <p className="text-xs text-bakery-200 mt-1">
                      70% Callebaut ganache, gold dust, custom piped message option
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Daily Capacity Meter Section */}
      <section
        id="capacity-overview"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-white rounded-3xl p-8 border border-bakery-200/90 shadow-bakery-soft">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs tracking-wider uppercase mb-1">
                <Calendar className="w-4 h-4" />
                <span>Live Capacity Tracker</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-bakery-950">
                Oven Schedule & Available Slots
              </h2>
              <p className="text-sm text-bakery-600 mt-1 max-w-xl">
                Cakes require a minimum 48-hour advance notice. Dates in the next 48 hours are closed for dough maturing and oven prep.
              </p>
            </div>
            <Link
              href="/menu"
              className="text-sm font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 shrink-0"
            >
              Order for an upcoming date <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 7-Day Capacity Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {capacities.map((cap, idx) => {
              const dateObj = new Date(cap.date + "T00:00:00Z");
              const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
              const dayMonth = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

              const isNoticeBlocked = !cap.meetsLeadTime;
              const isClosed = cap.isClosed;
              const isFull = cap.remainingCakes <= 0;

              let badgeStyle = "bg-green-50 text-green-800 border-green-200";
              let statusLabel = `${cap.remainingCakes} left`;

              if (isNoticeBlocked) {
                badgeStyle = "bg-bakery-100 text-bakery-500 border-bakery-200 opacity-60";
                statusLabel = "< 48h Notice";
              } else if (isClosed) {
                badgeStyle = "bg-red-50 text-red-700 border-red-200";
                statusLabel = "Closed";
              } else if (isFull) {
                badgeStyle = "bg-red-50 text-red-700 border-red-200";
                statusLabel = "Sold Out";
              } else if (cap.remainingCakes <= 3) {
                badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
              }

              return (
                <div
                  key={cap.date}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                    !isNoticeBlocked && !isClosed && !isFull
                      ? "bg-bakery-50/70 border-bakery-200 hover:border-amber-400 hover:shadow-sm"
                      : "bg-bakery-100/40 border-bakery-200/50"
                  }`}
                >
                  <div>
                    <span className="text-xs uppercase tracking-wider text-bakery-500 font-bold block">
                      {weekday}
                    </span>
                    <span className="font-display text-base font-bold text-bakery-950 block mt-0.5">
                      {dayMonth}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-bakery-200/50">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}
                    >
                      {statusLabel}
                    </span>
                    {!isNoticeBlocked && !isClosed && !isFull && (
                      <span className="block text-[11px] text-bakery-500 mt-1">
                        Cap: {cap.maxCakes} cakes
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Featured Cakes Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Small-Batch Creations</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-bakery-950">
              Artisan Menu Highlights
            </h2>
            <p className="text-base text-bakery-600 mt-1">
              Choose your cake, portion size, flavour blend, and custom piped message.
            </p>
          </div>
          <Link
            href="/menu"
            id="view-all-cakes-btn"
            className="px-6 py-3 rounded-xl bg-bakery-900 hover:bg-bakery-950 text-white font-medium text-sm transition-colors shadow-sm inline-flex items-center gap-2 shrink-0"
          >
            <span>View All 8 Cakes & Filters</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Cakes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cakes.map((cake) => (
            <CakeCard key={cake.id} {...cake} />
          ))}
        </div>
      </section>

      {/* 4. Bakery Pillars & Lead Time Policy */}
      <section id="lead-time" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-bakery-950 text-white rounded-3xl p-8 sm:p-14 relative overflow-hidden">
          <div className="max-w-3xl space-y-6 relative z-10">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
              The CakeCart Commitment
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
              Why we cap capacity and enforce a 48-hour notice window.
            </h2>
            <p className="text-bakery-300 leading-relaxed">
              Industrial bakeries freeze pre-baked sponges for weeks. At CakeCart, every single sponge is mixed and baked within 24 hours of your pickup. Because our small-batch ovens only accommodate 8 cakes per morning, capacity is locked atomically the second you reserve.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-bold text-base text-white">48h Minimum Notice</h4>
                <p className="text-xs text-bakery-300">
                  Enforced on client and server to ensure time for custom fillings and message piping.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-bold text-base text-white">24h Cancellation Rule</h4>
                <p className="text-xs text-bakery-300">
                  Cancel up to 24 hours before your pickup with an automatic full refund and capacity release.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="font-bold text-base text-white">40-Char Custom Piping</h4>
                <p className="text-xs text-bakery-300">
                  Precision hand-piped messages with live preview and strict database length validation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
