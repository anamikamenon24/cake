"use client";

import React, { useState, useEffect } from "react";
import { CakeCard } from "@/components/CakeCard";
import { SlidersHorizontal, Search, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

export default function MenuPage() {
  const [cakes, setCakes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dietaryTags, setDietaryTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDietary, setSelectedDietary] = useState<string>("all");
  const [selectedFlavour, setSelectedFlavour] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("popular");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchCakes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedDietary !== "all") params.set("dietary", selectedDietary);
      if (selectedFlavour !== "all") params.set("flavour", selectedFlavour);
      if (selectedSize !== "all") params.set("size", selectedSize);
      if (sortOption !== "popular") params.set("sort", sortOption);

      const res = await fetch(`/api/cakes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load cakes");
      const data = await res.json();
      setCakes(data.cakes || []);
      setCategories(data.categories || []);
      setDietaryTags(data.dietaryTags || []);
    } catch (err: any) {
      setError(err.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCakes();
  }, [selectedCategory, selectedDietary, selectedFlavour, selectedSize, sortOption]);

  const filteredCakes = cakes.filter((cake) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cake.name.toLowerCase().includes(q) ||
      cake.description.toLowerCase().includes(q)
    );
  });

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setSelectedDietary("all");
    setSelectedFlavour("all");
    setSelectedSize("all");
    setSortOption("popular");
    setSearchQuery("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Small-Batch Artisan Bakery</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-bakery-950 tracking-tight">
          Browse Our Artisan Cakes
        </h1>
        <p className="text-base text-bakery-600">
          Filtered by category, dietary requirement, custom portion size, and flavour accents.
        </p>
      </div>

      {/* Filter & Search Bar Panel */}
      <div className="bg-white rounded-3xl p-6 border border-bakery-200/90 shadow-bakery-soft space-y-6">
        {/* Top: Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-bakery-100">
          <button
            onClick={() => setSelectedCategory("all")}
            id="filter-cat-all"
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-bakery-50 text-bakery-800 hover:bg-bakery-100"
            }`}
          >
            All Collections
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              id={`filter-cat-${cat.slug}`}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.slug
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-bakery-50 text-bakery-800 hover:bg-bakery-100"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Secondary Filters Row: Dietary, Flavour, Size, Sort, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Dietary Filter */}
          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1.5">
              Dietary Tag
            </label>
            <select
              value={selectedDietary}
              onChange={(e) => setSelectedDietary(e.target.value)}
              id="filter-dietary-select"
              className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-3 py-2.5 text-sm text-bakery-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Dietary Preferences</option>
              {dietaryTags.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Flavour Filter */}
          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1.5">
              Flavour Accent
            </label>
            <select
              value={selectedFlavour}
              onChange={(e) => setSelectedFlavour(e.target.value)}
              id="filter-flavour-select"
              className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-3 py-2.5 text-sm text-bakery-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Flavours</option>
              <option value="Chocolate">Dark Chocolate</option>
              <option value="Caramel">Salted Butter Caramel</option>
              <option value="Raspberry">Wild Raspberry</option>
              <option value="Signature">Original Signature</option>
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1.5">
              Portion Size
            </label>
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              id="filter-size-select"
              className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-3 py-2.5 text-sm text-bakery-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Sizes</option>
              <option value="6">6" Petit (6-8 Servings)</option>
              <option value="8">8" Classic (12-14 Servings)</option>
              <option value="10">10" Grand (20-25 Servings)</option>
            </select>
          </div>

          {/* Sort Option */}
          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1.5">
              Sort By
            </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              id="filter-sort-select"
              className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-3 py-2.5 text-sm text-bakery-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="popular">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-xs font-semibold text-bakery-700 uppercase tracking-wider mb-1.5">
              Keyword
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search cakes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="filter-search-input"
                className="w-full bg-bakery-50 border border-bakery-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-bakery-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search className="w-4 h-4 text-bakery-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between pt-2 text-xs text-bakery-600">
          <span>
            Showing <strong>{filteredCakes.length}</strong> cakes available for booking
          </span>
          {(selectedCategory !== "all" ||
            selectedDietary !== "all" ||
            selectedFlavour !== "all" ||
            selectedSize !== "all" ||
            searchQuery.trim() !== "") && (
            <button
              onClick={clearAllFilters}
              id="clear-filters-btn"
              className="text-amber-700 hover:text-amber-800 font-semibold underline"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Cakes Listing */}
      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-bakery-700">Loading artisan cakes from bakery oven...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-medium text-red-900">{error}</p>
          <button
            onClick={fetchCakes}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : filteredCakes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-bakery-200/90 space-y-4">
          <p className="text-lg font-bold text-bakery-950">No artisan cakes match your selected filters</p>
          <p className="text-sm text-bakery-600">
            Try adjusting your dietary or flavour filters to view our full creation catalog.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCakes.map((cake) => (
            <CakeCard key={cake.id} {...cake} />
          ))}
        </div>
      )}
    </div>
  );
}
