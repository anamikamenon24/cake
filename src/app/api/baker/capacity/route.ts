import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireBaker } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const baker = await requireBaker();
    const body = await request.json();
    const { bakeryDate, maxCakes, isClosed } = body;

    if (!bakeryDate) {
      return NextResponse.json({ error: "bakeryDate is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check current reservations
      const existingRes = await client.query(
        `SELECT id, max_cakes, reserved_cakes, is_closed FROM daily_capacity WHERE bakery_date = $1 FOR UPDATE`,
        [bakeryDate]
      );

      let currentReserved = 0;
      if (existingRes.rows.length > 0) {
        currentReserved = existingRes.rows[0].reserved_cakes;
      }

      const newMaxCakes = maxCakes !== undefined ? parseInt(maxCakes, 10) : existingRes.rows[0]?.max_cakes || 8;
      const newIsClosed = isClosed !== undefined ? Boolean(isClosed) : existingRes.rows[0]?.is_closed || false;

      // Validate check constraint: reserved_cakes must never exceed max_cakes
      if (newMaxCakes < currentReserved) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: `Cannot reduce max capacity to ${newMaxCakes}. There are already ${currentReserved} reserved cakes for this date.`,
          },
          { status: 400 }
        );
      }

      const upsertRes = await client.query(
        `INSERT INTO daily_capacity (bakery_date, max_cakes, reserved_cakes, is_closed, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (bakery_date) DO UPDATE 
         SET max_cakes = EXCLUDED.max_cakes, is_closed = EXCLUDED.is_closed, updated_at = NOW()
         RETURNING id, bakery_date, max_cakes, reserved_cakes, is_closed`,
        [bakeryDate, newMaxCakes, currentReserved, newIsClosed]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details, created_at)
         VALUES ('DAILY_CAPACITY_UPDATED', 'daily_capacity', $1, $2, $3, NOW())`,
        [
          upsertRes.rows[0].id,
          baker.id,
          JSON.stringify({
            bakeryDate,
            maxCakes: newMaxCakes,
            isClosed: newIsClosed,
            updatedBy: baker.email,
          }),
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        capacity: upsertRes.rows[0],
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error modifying capacity:", error);
    const status = error.message?.includes("Baker privileges") ? 403 : error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to update capacity" },
      { status }
    );
  }
}
