import { NextResponse, type NextRequest } from "next/server";

// Fast redirect for signed-out visitors. The real check happens on the API: this only looks
// for the refresh cookie so /dashboard doesn't flash before bouncing to /login.
export function middleware(req: NextRequest) {
  if (!req.cookies.has("mf_rt")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
