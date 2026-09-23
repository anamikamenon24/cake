import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    let user;
    try {
      const res = await client.query(
        `SELECT id, email, password_hash, full_name, phone, role FROM users WHERE LOWER(email) = LOWER($1)`,
        [email.trim()]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      user = res.rows[0];
    } finally {
      client.release();
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionPayload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role as "customer" | "baker",
    };

    await setSessionCookie(sessionPayload);

    return NextResponse.json({
      success: true,
      user: sessionPayload,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    );
  }
}
