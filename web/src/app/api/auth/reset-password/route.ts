import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/bcrypt";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body.token || "").toString().trim();
    const password = (body.password || "").toString();

    if (!token || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }

    const tokenResult = await sql`
      SELECT prt.id, prt.user_id
      FROM password_reset_tokens prt
      WHERE prt.token = ${token}
        AND prt.used_at IS NULL
        AND prt.expires_at > now()
      LIMIT 1
    `;

    const row = tokenResult.rows[0];

    if (!row) {
      return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await sql`BEGIN`;
    try {
      await sql`
        UPDATE users
        SET password_hash = ${passwordHash}, updated_at = now()
        WHERE id = ${row.user_id}
      `;

      await sql`
        UPDATE password_reset_tokens
        SET used_at = now()
        WHERE id = ${row.id}
      `;

      await sql`COMMIT`;
    } catch (e) {
      await sql`ROLLBACK`;
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in reset-password handler", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
