import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const FALLBACK_CANONICAL_HOST = "www.deliciousroute.com";

function getCanonicalHost() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "";

  if (!configuredBaseUrl) {
    return FALLBACK_CANONICAL_HOST;
  }

  try {
    const parsed = new URL(
      configuredBaseUrl.startsWith("http")
        ? configuredBaseUrl
        : `https://${configuredBaseUrl}`,
    );

    return parsed.host || FALLBACK_CANONICAL_HOST;
  } catch {
    return FALLBACK_CANONICAL_HOST;
  }
}

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get("host") || "";

  if (!hostHeader || hostHeader.includes("localhost")) {
    return NextResponse.next();
  }

  const canonicalHost = getCanonicalHost();

  if (hostHeader.toLowerCase() === canonicalHost.toLowerCase()) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  redirectUrl.host = canonicalHost;

  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|vendor-profile-images).*)",
  ],
};
