import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const pathname = req.nextUrl.pathname;

  // /admin-login - публичная страница
  if (pathname === "/admin-login") {
    return NextResponse.next();
  }

  // Если залогинен и пытается зайти на login
  if (isLoggedIn && pathname === "/login") {
    const redirectUrl = userRole === "super_admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // Защита /admin/* 
  if (pathname.startsWith("/admin")) {
    const adminCookie = req.cookies.get("admin_id");
    if (!adminCookie) {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }
  }

  // Защита /dashboard/*
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/admin-login"],
};