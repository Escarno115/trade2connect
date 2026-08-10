import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limit check backed by public.check_rate_limit.
 * Must be called with an admin (service-role) client.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  key: string,
  maxRequests = 10,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    _key: key,
    _max_requests: maxRequests,
    _window_seconds: windowSeconds,
  });

  if (error) {
    // Fail open so a rate-limit outage never blocks legitimate traffic.
    console.error("rate limit check failed:", error.message);
    return { allowed: true, currentCount: 0, retryAfterSeconds: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: row?.allowed !== false,
    currentCount: row?.current_count ?? 0,
    retryAfterSeconds: row?.retry_after_seconds ?? windowSeconds,
  };
}

export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Too many requests — please slow down and try again shortly.",
      retryAfterSeconds: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}
