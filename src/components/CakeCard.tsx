import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Check } from "lucide-react";

interface CakeCardProps {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number; // in cents
  imageUrl: string;
  dietaryTags: { id: string; name: string; slug: string }[];
  sizes: { name: string; priceModifier: number }[];
}

export function CakeCard({
  id,
  slug,
  name,
  description,
  basePrice,
  imageUrl,
  dietaryTags,
  sizes,
}: CakeCardProps) {
  const formattedPrice = (basePrice / 100).toFixed(2);

  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-bakery-200/80 shadow-bakery-soft hover:shadow-bakery-hover transition-all duration-300 flex flex-col">
      {/* Image Container */}
      <div className="relative h-64 w-full overflow-hidden bg-bakery-100">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        {/* Subtle overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-bakery-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Dietary Tag Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {dietaryTags.map((tag) => (
            <span
              key={tag.id}
              className="px-2.5 py-1 text-[11px] font-semibold tracking-wide rounded-full bg-white/95 text-amber-900 shadow-sm backdrop-blur-md border border-amber-200/60"
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* Base Price Badge */}
        <div className="absolute bottom-3 right-3 z-10 bg-bakery-950/90 text-white px-3 py-1.5 rounded-xl text-sm font-bold backdrop-blur-md border border-white/20 shadow-md">
          <span className="text-xs text-amber-300 font-normal">from </span>
          ${formattedPrice}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-display text-xl font-bold text-bakery-950 group-hover:text-amber-800 transition-colors line-clamp-1">
            {name}
          </h3>
          <p className="text-sm text-bakery-600 mt-2 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Sizes Pill info */}
        {sizes.length > 0 && (
          <div className="pt-2 border-t border-bakery-100">
            <span className="text-xs text-bakery-500 block mb-1.5 font-medium">
              Available Portions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((s, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-bakery-100 text-bakery-800 font-medium"
                >
                  {s.name.split(" ")[0]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href={`/customise/${id}`}
            id={`customise-btn-${slug}`}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition-all duration-200 shadow-sm group-hover:shadow-md"
          >
            <span>Customise & Reserve</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
