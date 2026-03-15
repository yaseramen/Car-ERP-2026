import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const path = nextUrl.pathname;

  // صفحات عامة - مسارات Next-Auth
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // صفحة تسجيل الدخول والتسجيل
  if (path === "/login" || path === "/register") {
    if (isLoggedIn) {
      const role = req.auth?.user?.role;
      if (["super_admin", "tenant_owner", "employee"].includes(role ?? "")) {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      }
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // حماية /admin - Super Admin أو Tenant Owner أو Employee
  if (path.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    const role = req.auth?.user?.role;
    if (role !== "super_admin" && role !== "tenant_owner" && role !== "employee") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // الصفحة الرئيسية - صفحة ترحيبية عامة (لا تتطلب تسجيل دخول)
  if (path === "/") {
    const role = req.auth?.user?.role;
    if (isLoggedIn && ["super_admin", "tenant_owner", "employee"].includes(role ?? "")) {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    return NextResponse.next();
  }

  // باقي المسارات المحمية
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // استثناء "/" والملفات الثابتة - الصفحة الترحيبية تُحمّل مباشرة
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|$).+)"],
};
