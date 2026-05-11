import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroySession();

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });
  response.cookies.delete("dr_session");
  return response;
}
