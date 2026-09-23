"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { CartItem, CartState } from "./types";

interface CartContextType {
  cart: CartState;
  addItem: (item: Omit<CartItem, "id" | "totalItemPrice">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setPickupSchedule: (date: string, slotId: string, slotDisplay: string) => void;
  clearCart: () => void;
  subtotalCents: number;
  messageFeesCents: number;
  totalCents: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cakecart_active_basket_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>({
    items: [],
    pickupDate: null,
    pickupSlotId: null,
    pickupSlotDisplay: null,
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load cart from storage", e);
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to storage", e);
    }
  }, [cart]);

  const addItem = (item: Omit<CartItem, "id" | "totalItemPrice">) => {
    const unitPrice =
      item.basePrice +
      item.customisation.selectedSizePriceModifier +
      item.customisation.selectedFlavourPriceModifier +
      item.customisation.messageFee;

    const newItem: CartItem = {
      ...item,
      id: `cart-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      totalItemPrice: unitPrice * item.quantity,
    };

    setCart((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const removeItem = (id: string) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) => {
        if (i.id !== id) return i;
        const unitPrice =
          i.basePrice +
          i.customisation.selectedSizePriceModifier +
          i.customisation.selectedFlavourPriceModifier +
          i.customisation.messageFee;
        return {
          ...i,
          quantity,
          totalItemPrice: unitPrice * quantity,
        };
      }),
    }));
  };

  const setPickupSchedule = (date: string, slotId: string, slotDisplay: string) => {
    setCart((prev) => ({
      ...prev,
      pickupDate: date,
      pickupSlotId: slotId,
      pickupSlotDisplay: slotDisplay,
    }));
  };

  const clearCart = () => {
    setCart({
      items: [],
      pickupDate: null,
      pickupSlotId: null,
      pickupSlotDisplay: null,
    });
  };

  // Calculations
  const itemCount = cart.items.reduce((sum, it) => sum + it.quantity, 0);

  const messageFeesCents = cart.items.reduce(
    (sum, it) => sum + it.customisation.messageFee * it.quantity,
    0
  );

  const subtotalCents = cart.items.reduce((sum, it) => {
    const baseAndModifiers =
      it.basePrice +
      it.customisation.selectedSizePriceModifier +
      it.customisation.selectedFlavourPriceModifier;
    return sum + baseAndModifiers * it.quantity;
  }, 0);

  const totalCents = subtotalCents + messageFeesCents;

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        updateQuantity,
        setPickupSchedule,
        clearCart,
        subtotalCents,
        messageFeesCents,
        totalCents,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
