import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { ensureDatabaseInitialized } from "@/db/init";
import { MINIMUM_LEAD_TIME_HOURS } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseInitialized().catch(console.error);

    const searchParams = request.nextUrl.searchParams;
    const selectedDate = searchParams.get("date");

    const client = await pool.connect();
    try {
      // 1. Fetch 14-day capacity
      const capacityRes = await client.query(
        `SELECT id, bakery_date, max_cakes, reserved_cakes, is_closed 
         FROM daily_capacity 
         WHERE bakery_date >= CURRENT_DATE 
         ORDER BY bakery_date ASC 
         LIMIT 14`
      );

      const now = new Date();
      const minNoticeDate = new Date(now.getTime() + MINIMUM_LEAD_TIME_HOURS * 60 * 60 * 1000);

      const capacities = capacityRes.rows.map((row) => {
        // Format date string YYYY-MM-DD
        const dateObj = new Date(row.bakery_date);
        const dateString = row.bakery_date instanceof Date 
          ? row.bakery_date.toISOString().split("T")[0]
          : String(row.bakery_date).split("T")[0];

        const remainingCakes = Math.max(0, row.max_cakes - row.reserved_cakes);
        const dayDateTime = new Date(`${dateString}T23:59:59Z`);
        const meetsLeadTime = dayDateTime >= minNoticeDate;

        let isAvailable = true;
        let reason = "";

        if (!meetsLeadTime) {
          isAvailable = false;
          reason = `Requires min ${MINIMUM_LEAD_TIME_HOURS}h advance notice`;
        } else if (row.is_closed) {
          isAvailable = false;
          reason = "Bakery is closed on this date";
        } else if (remainingCakes <= 0) {
          isAvailable = false;
          reason = "Sold out / Capacity reached";
        }

        return {
          id: row.id,
          bakeryDate: dateString,
          maxCakes: row.max_cakes,
          reservedCakes: row.reserved_cakes,
          remainingCakes,
          isClosed: row.is_closed,
          meetsLeadTime,
          isAvailable,
          reason,
        };
      });

      // 2. If a specific date is selected, fetch pickup slots for it
      let slots: any[] = [];
      if (selectedDate) {
        const slotsRes = await client.query(
          `SELECT id, bakery_date, start_time, end_time, max_orders, reserved_orders 
           FROM pickup_slots 
           WHERE bakery_date = $1 
           ORDER BY start_time ASC`,
          [selectedDate]
        );

        slots = slotsRes.rows.map((slot) => {
          const remainingOrders = Math.max(0, slot.max_orders - slot.reserved_orders);
          return {
            id: slot.id,
            bakeryDate: selectedDate,
            startTime: slot.start_time.slice(0, 5),
            endTime: slot.end_time.slice(0, 5),
            maxOrders: slot.max_orders,
            reservedOrders: slot.reserved_orders,
            remainingOrders,
            isAvailable: remainingOrders > 0,
          };
        });
      }

      return NextResponse.json({
        capacities,
        minimumLeadTimeHours: MINIMUM_LEAD_TIME_HOURS,
        slots,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching capacity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch capacity" },
      { status: 500 }
    );
  }
}
