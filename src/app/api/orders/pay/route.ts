import { NextRequest, NextResponse } from "next/server";
import { processPayment } from "@/lib/payment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, idempotencyKey, amount, testOutcome } = body;

    if (!orderId || !idempotencyKey) {
      return NextResponse.json(
        { error: "Order ID and idempotency key are required" },
        { status: 400 }
      );
    }

    const result = await processPayment({
      orderId,
      idempotencyKey,
      amount: parseInt(amount, 10),
      testOutcome: testOutcome || "success",
    });

    return NextResponse.json({
      success: result.paymentStatus === "PAID",
      ...result,
    });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment processing failed" },
      { status: 400 }
    );
  }
}
