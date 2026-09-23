import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelOrder } from "@/lib/transactions/cancel-order";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const result = await cancelOrder({
      orderId,
      userId: user?.id,
      userRole: user?.role || "customer",
      reason,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cancellation failed" },
      { status: 400 }
    );
  }
}
