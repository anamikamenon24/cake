import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/transactions/release-holds";

export async function GET(request: NextRequest) {
  // Protect route with CRON_SECRET (Vercel Cron provides Bearer token in Authorization header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const providedSecret =
    authHeader?.replace("Bearer ", "") ||
    request.nextUrl.searchParams.get("secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await releaseExpiredHolds();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Error in release-holds cron:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
