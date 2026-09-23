import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, phone } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Full name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Check if user already exists
      const existing = await client.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
        [email.trim()]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }

      const passwordHash = await hashPassword(password);

      const insertRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role)
         VALUES ($1, $2, $3, $4, 'customer')
         RETURNING id, email, full_name, phone, role`,
        [email.trim().toLowerCase(), passwordHash, fullName.trim(), phone?.trim() || null]
      );

      const newUser = insertRes.rows[0];
      const sessionPayload = {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        phone: newUser.phone,
        role: newUser.role as "customer",
      };

      await setSessionCookie(sessionPayload);

      return NextResponse.json({
        success: true,
        user: sessionPayload,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}
