import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrderHold } from "@/lib/transactions/order-hold";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    const {
      customerName,
      customerEmail,
      customerPhone,
      pickupDate,
      pickupSlotId,
      items,
    } = body;

    const result = await createOrderHold({
      userId: user?.id || null,
      customerName: customerName || user?.fullName || "",
      customerEmail: customerEmail || user?.email || "",
      customerPhone: customerPhone || user?.phone || "",
      pickupDate,
      pickupSlotId,
      items,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error creating order hold:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order hold" },
      { status: 400 }
    );
  }
}
