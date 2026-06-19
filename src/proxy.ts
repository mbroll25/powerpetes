import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseProxyConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}

function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname === "/register";
}

function isProtectedRoute(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/onboarding" ||
    pathname === "/room" ||
    pathname.startsWith("/room/")
  );
}

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  path: string,
) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({
    request,
  });

  const { supabaseUrl, supabaseKey } = getSupabaseProxyConfig();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isProtectedRoute(pathname)) {
      return redirectWithCookies(request, response, "/login");
    }

    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed")
    .eq("id", user.id)
    .maybeSingle();

  const profileCompleted = profile?.profile_completed === true;

  if (isAuthRoute(pathname)) {
    return redirectWithCookies(
      request,
      response,
      profileCompleted ? "/dashboard" : "/onboarding",
    );
  }

  if (pathname === "/onboarding" && profileCompleted) {
    return redirectWithCookies(request, response, "/dashboard");
  }

  if (
    (pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname === "/room" ||
      pathname.startsWith("/room/")) &&
    !profileCompleted
  ) {
    return redirectWithCookies(request, response, "/onboarding");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)",
  ],
};
