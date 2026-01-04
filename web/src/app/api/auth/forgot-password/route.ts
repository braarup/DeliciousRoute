import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@vercel/postgres";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TOKEN_TTL_HOURS = 2;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "missing_email" }, { status: 400 });
    }

    const userResult = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = randomUUID();
    const tokenId = randomUUID();

    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000
    ).toISOString();

    await sql`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
      VALUES (${tokenId}, ${user.id}, ${token}, ${expiresAt})
    `;

    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.VERCEL_URL || "";
    const origin = baseUrl
      ? baseUrl.startsWith("http")
        ? baseUrl
        : `https://${baseUrl}`
      : undefined;

    const resetUrl = origin
      ? `${origin}/reset-password/${encodeURIComponent(token)}`
      : `/reset-password/${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({ to: email, resetUrl });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in forgot-password handler", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
