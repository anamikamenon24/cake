"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import {
  Sparkles,
  Calendar,
  Clock,
  Upload,
  Check,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  Info,
} from "lucide-react";
import {
  MINIMUM_LEAD_TIME_HOURS,
  MAX_CUSTOM_MESSAGE_LENGTH,
  CUSTOM_MESSAGE_FEE_CENTS,
} from "@/lib/types";

export default function CustomiseCakePage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, setPickupSchedule } = useCart();
  const cakeId = params.id as string;

  const [cake, setCake] = useState<any | null>(null);
  const [capacities, setCapacities] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customisation states
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedFlavour, setSelectedFlavour] = useState<string>("");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Schedule states
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");

  // Quantity
  const [quantity, setQuantity] = useState<number>(1);

  // 1. Fetch Cake details & Capacity on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cakeRes, capRes] = await Promise.all([
          fetch(`/api/cakes/${cakeId}`),
          fetch(`/api/capacity`),
        ]);

        if (!cakeRes.ok) throw new Error("Could not find cake");
        const cakeData = await cakeRes.json();
        setCake(cakeData.cake);

        // Pre-select defaults
        if (cakeData.cake.sizes?.length > 0) {
          const defSize = cakeData.cake.sizes.find((s: any) => s.isDefault) || cakeData.cake.sizes[0];
          setSelectedSize(defSize.name);
        }
        if (cakeData.cake.flavours?.length > 0) {
          const defFlav = cakeData.cake.flavours.find((f: any) => f.isDefault) || cakeData.cake.flavours[0];
          setSelectedFlavour(defFlav.name);
        }

        if (capRes.ok) {
          const capData = await capRes.json();
          setCapacities(capData.capacities || []);

          // Find first available date (that meets lead time and has capacity)
          const firstAvail = capData.capacities.find((c: any) => c.isAvailable);
          if (firstAvail) {
            setSelectedDate(firstAvail.bakeryDate);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load cake customiser");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [cakeId]);

  // 2. Fetch Slots whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    async function loadSlots() {
      try {
        const res = await fetch(`/api/capacity?date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots || []);
          // Preselect first available slot
          const availSlot = data.slots.find((s: any) => s.isAvailable);
          if (availSlot) {
            setSelectedSlotId(availSlot.id);
          } else {
            setSelectedSlotId("");
          }
        }
      } catch (e) {
        console.error("Failed to load slots", e);
      }
    }

    loadSlots();
  }, [selectedDate]);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "references");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");
      setReferenceImageUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-bakery-800 font-medium">Preparing cake workshop...</p>
      </div>
    );
  }

  if (error || !cake) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h2 className="text-xl font-bold text-bakery-950">Cake Not Found</h2>
        <p className="text-sm text-bakery-600">{error || "This creation is currently not available."}</p>
        <button
          onClick={() => router.push("/menu")}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  // Calculate pricing breakdown
  const sizeObj = cake.sizes.find((s: any) => s.name === selectedSize);
  const sizeModifier = sizeObj ? sizeObj.priceModifier : 0;

  const flavourObj = cake.flavours.find((f: any) => f.name === selectedFlavour);
  const flavourModifier = flavourObj ? flavourObj.priceModifier : 0;

  const hasMessage = customMessage.trim().length > 0;
  const messageFee = hasMessage ? CUSTOM_MESSAGE_FEE_CENTS : 0;

  const unitTotalCents = cake.basePrice + sizeModifier + flavourModifier + messageFee;
  const lineTotalCents = unitTotalCents * quantity;

  // Selected slot obj
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const slotDisplay = selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : "Select Slot";

  const handleAddToCart = () => {
    if (!selectedDate) {
      alert("Please select an available pickup date.");
      return;
    }
    if (!selectedSlotId) {
      alert("Please select an available pickup time slot.");
      return;
    }

    // Add to cart
    addItem({
      productId: cake.id,
      productName: cake.name,
      productSlug: cake.slug,
      imageUrl: cake.imageUrl,
      basePrice: cake.basePrice,
      quantity,
      customisation: {
        selectedSize,
        selectedSizePriceModifier: sizeModifier,
        selectedFlavour,
        selectedFlavourPriceModifier: flavourModifier,
        customMessage: customMessage.trim(),
        messageFee,
        referenceImageUrl,
      },
    });

    // Set schedule
    setPickupSchedule(selectedDate, selectedSlotId, slotDisplay);

    // Redirect to cart
    router.push("/cart");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-semibold text-bakery-700 hover:text-bakery-950 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to creations</span>
      </button>

      {/* Main Two-Column Workshop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Visual Showcase & Message Preview */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
          <div className="relative rounded-3xl overflow-hidden shadow-bakery-hover border border-bakery-200 bg-white">
            <img
              src={cake.imageUrl}
              alt={cake.name}
              className="w-full h-80 sm:h-96 object-cover object-center"
            />

            {/* Live Message Piping Callout Overlay */}
            {hasMessage && (
              <div className="absolute inset-x-4 bottom-4 p-4 rounded-2xl bg-bakery-950/90 text-white backdrop-blur-md border border-white/20 shadow-xl animate-fade-in">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block mb-1">
                  Custom Piped Calligraphy Preview:
                </span>
                <p className="font-serif italic text-lg text-amber-100 text-center tracking-wide py-1 border-y border-white/10">
                  "{customMessage}"
                </p>
                <div className="flex items-center justify-between text-[11px] text-bakery-300 mt-1.5">
                  <span>Piped in ganache</span>
                  <span>+$3.00 piping fee</span>
                </div>
              </div>
            )}
          </div>

          {/* Reference Image Preview */}
          {referenceImageUrl && (
            <div className="p-4 bg-white rounded-2xl border border-bakery-200 flex items-center gap-4">
              <img
                src={referenceImageUrl}
                alt="Reference design"
                className="w-16 h-16 rounded-xl object-cover border"
              />
              <div className="text-xs">
                <p className="font-bold text-bakery-950">Design Reference Attached</p>
                <p className="text-bakery-600">Our baker will reference your photo when finishing.</p>
                <button
                  onClick={() => setReferenceImageUrl(null)}
                  className="text-red-600 hover:underline mt-1 font-semibold"
                >
                  Remove reference
                </button>
              </div>
            </div>
          )}

          {/* Bakery Lead Time Reminder Box */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>48-Hour Notice Guaranteed Freshness:</strong> We don't freeze cakes. Every sponge is freshly baked for your chosen collection slot.
            </div>
          </div>
        </div>

        {/* Right Column: Customisation Controls */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-bakery-200/90 shadow-bakery-soft space-y-8">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {cake.dietaryTags?.map((tag: any) => (
                <span
                  key={tag.id}
                  className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100/70 text-amber-900 border border-amber-200"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-bakery-950">
              {cake.name}
            </h1>
            <p className="text-sm text-bakery-600 mt-2 leading-relaxed">
              {cake.description}
            </p>
          </div>

          {/* 1. Size Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-bakery-900 uppercase tracking-wider">
              1. Choose Cake Portion Size
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cake.sizes.map((size: any) => {
                const isSelected = selectedSize === size.name;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedSize(size.name)}
                    id={`size-btn-${size.name.split(" ")[0].replace(/"/g, "")}`}
                    className={`p-3.5 rounded-2xl text-left border transition-all ${
                      isSelected
                        ? "border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20"
                        : "border-bakery-200 hover:border-bakery-300 bg-bakery-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-bakery-950 block">
                        {size.name.split(" ")[0]}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <span className="text-xs text-bakery-500 block mt-0.5">
                      {size.name.replace(/^[0-9]+"\s*/, "")}
                    </span>
                    <span className="text-xs font-bold text-amber-800 block mt-2">
                      {size.priceModifier === 0
                        ? "Base price"
                        : `+$${(size.priceModifier / 100).toFixed(2)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Flavour Accent Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-bakery-900 uppercase tracking-wider">
              2. Select Flavour Infusion
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cake.flavours.map((fl: any) => {
                const isSelected = selectedFlavour === fl.name;
                return (
                  <button
                    key={fl.id}
                    type="button"
                    onClick={() => setSelectedFlavour(fl.name)}
                    className={`p-3.5 rounded-2xl text-left border transition-all ${
                      isSelected
                        ? "border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20"
                        : "border-bakery-200 hover:border-bakery-300 bg-bakery-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-bakery-950">
                        {fl.name}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                    </div>
                    <span className="text-xs text-amber-800 font-medium block mt-1">
                      {fl.priceModifier === 0
                        ? "Included"
                        : `+$${(fl.priceModifier / 100).toFixed(2)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Custom Piped Cake Message */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="custom-message-input"
                className="block text-xs font-bold text-bakery-900 uppercase tracking-wider"
              >
                3. Custom Piped Cake Message (Optional)
              </label>
              <span
                id="message-char-count"
                className={`text-xs font-semibold ${
                  customMessage.length > MAX_CUSTOM_MESSAGE_LENGTH
                    ? "text-red-600"
                    : customMessage.length >= 35
                    ? "text-amber-600"
                    : "text-bakery-500"
                }`}
              >
                {customMessage.length} / {MAX_CUSTOM_MESSAGE_LENGTH} chars
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                id="custom-message-input"
                maxLength={MAX_CUSTOM_MESSAGE_LENGTH}
                placeholder="e.g. Happy 30th Birthday David! ✨"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-bakery-50 border border-bakery-300 rounded-xl px-4 py-3 text-sm text-bakery-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <p className="text-xs text-bakery-500">
              Hand-piped on top of the cake. A $3.00 custom message fee is added when a message is specified. Limit 40 characters strictly enforced.
            </p>
          </div>

          {/* 4. Customer Reference Image Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-bakery-900 uppercase tracking-wider">
              4. Upload Reference Photo (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="reference-image-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-bakery-300 bg-bakery-50 hover:bg-bakery-100 text-bakery-800 text-xs font-semibold transition-colors"
              >
                <Upload className="w-4 h-4 text-bakery-600" />
                <span>{isUploading ? "Uploading..." : "Attach Inspiration Image"}</span>
              </label>
              <input
                id="reference-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              <span className="text-xs text-bakery-500">Max 5MB (JPEG, PNG, WEBP)</span>
            </div>
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          </div>

          {/* 5. Pickup Date Selection with 48h Lead Time */}
          <div className="space-y-3 pt-4 border-t border-bakery-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-bakery-900 uppercase tracking-wider">
                5. Select Pickup Date (Min 48h Lead Time)
              </label>
              <span className="text-xs text-amber-700 font-semibold">
                Daily Limit: 8-10 Cakes
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {capacities.map((cap) => {
                const dateObj = new Date(cap.bakeryDate + "T00:00:00Z");
                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                const dateNum = dateObj.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
                const isSelected = selectedDate === cap.bakeryDate;
                const isDisabled = !cap.isAvailable;

                return (
                  <button
                    key={cap.bakeryDate}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setSelectedDate(cap.bakeryDate)}
                    id={`date-picker-${cap.bakeryDate}`}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isDisabled
                        ? "bg-bakery-100/60 border-bakery-200 text-bakery-400 cursor-not-allowed opacity-60"
                        : isSelected
                        ? "border-amber-600 bg-amber-500 text-white font-bold shadow-sm"
                        : "border-bakery-200 hover:border-amber-400 bg-bakery-50/50 text-bakery-900"
                    }`}
                  >
                    <span className="text-[11px] block uppercase">{dayName}</span>
                    <span className="text-sm font-extrabold block">{dateNum}</span>
                    <span
                      className={`text-[10px] block mt-1 font-semibold ${
                        isSelected
                          ? "text-amber-100"
                          : isDisabled
                          ? "text-bakery-400"
                          : cap.remainingCakes <= 2
                          ? "text-amber-700"
                          : "text-green-700"
                      }`}
                    >
                      {isDisabled ? (cap.isClosed ? "Closed" : cap.meetsLeadTime ? "Sold Out" : "<48h") : `${cap.remainingCakes} left`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Pickup Time Slot Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-bakery-900 uppercase tracking-wider">
              6. Select Pickup Time Window
            </label>
            {slots.length === 0 ? (
              <p className="text-xs text-bakery-500 italic">Please select an available date first.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {slots.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  const isDisabled = !slot.isAvailable;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedSlotId(slot.id)}
                      id={`slot-btn-${slot.startTime.replace(":", "")}`}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isDisabled
                          ? "bg-bakery-100/60 border-bakery-200 text-bakery-400 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "border-amber-600 bg-amber-600 text-white font-bold"
                          : "border-bakery-200 hover:border-amber-400 bg-bakery-50/50 text-bakery-900"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 mx-auto mb-1 opacity-80" />
                      <span className="text-xs font-bold block">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <span
                        className={`text-[10px] block mt-0.5 ${
                          isSelected ? "text-amber-100" : "text-bakery-500"
                        }`}
                      >
                        {isDisabled ? "Full" : `${slot.remainingOrders} slots`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7. Quantity & Final Itemized Total Breakdown */}
          <div className="p-6 rounded-2xl bg-bakery-50 border border-bakery-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-bakery-200">
              <span className="text-sm font-bold text-bakery-900">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-bakery-300 font-bold text-bakery-800 flex items-center justify-center hover:bg-bakery-100"
                >
                  -
                </button>
                <span className="font-extrabold text-sm text-bakery-950 w-4 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(8, q + 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-bakery-300 font-bold text-bakery-800 flex items-center justify-center hover:bg-bakery-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="space-y-1.5 text-xs text-bakery-600">
              <div className="flex justify-between">
                <span>Base Cake ({selectedSize.split(" ")[0]})</span>
                <span>${((cake.basePrice + sizeModifier) / 100).toFixed(2)}</span>
              </div>
              {flavourModifier > 0 && (
                <div className="flex justify-between">
                  <span>Flavour Infusion ({selectedFlavour})</span>
                  <span>+${(flavourModifier / 100).toFixed(2)}</span>
                </div>
              )}
              {messageFee > 0 && (
                <div className="flex justify-between text-amber-800 font-medium">
                  <span>Custom Hand-Piped Message</span>
                  <span>+${(messageFee / 100).toFixed(2)}</span>
                </div>
              )}
              {quantity > 1 && (
                <div className="flex justify-between text-bakery-500">
                  <span>Item Subtotal ({quantity} × ${((unitTotalCents) / 100).toFixed(2)})</span>
                  <span>${((lineTotalCents) / 100).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-bakery-200 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-bakery-500 font-bold block">
                  Total Investment
                </span>
                <span className="font-display text-3xl font-extrabold text-bakery-950">
                  ${(lineTotalCents / 100).toFixed(2)}
                </span>
              </div>

              {/* Add to Cart CTA */}
              <button
                type="button"
                onClick={handleAddToCart}
                id="add-to-cart-submit-btn"
                className="px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart & Reserve</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
