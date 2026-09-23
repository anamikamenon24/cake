import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "CakeCart — Artisan Home Bakery with Daily Capacity & Custom Messages",
  description:
    "Order exquisite handcrafted celebration cakes, artisan chiffons, and dietary specials with real-time oven capacity, 48-hour lead time, custom cake piping, and easy pickup slots.",
  keywords: [
    "artisan cake",
    "home bakery",
    "custom cake messages",
    "eggless cake",
    "gluten free cake",
    "pickup slots",
    "daily capacity bakery",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-bakery-50 text-bakery-950 antialiased selection:bg-amber-200 selection:text-amber-900">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
