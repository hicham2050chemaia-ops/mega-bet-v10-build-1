
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "GET") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: corsHeaders }
      );
    }

    if (!["/", "/fixtures", "/usage"].includes(path)) {
      return Response.json(
        { error: "Endpoint not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!env.API_FOOTBALL_KEY) {
      return Response.json(
        { error: "API key is not configured" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Check API subscription usage
    if (path === "/usage") {
      try {
        const response = await fetch(
          "https://v3.football.api-sports.io/status",
          {
            headers: {
              "x-apisports-key": env.API_FOOTBALL_KEY
            }
          }
        );

        const data = await response.json();

        if (!response.ok || !data.response) {
          return Response.json(
            { error: "Could not read API usage", details: data.errors },
            { status: 502, headers: corsHeaders }
          );
        }

        const info = data.response;

        return Response.json({
          success: true,
          subscription: {
            plan: info.subscription?.plan,
            active: info.subscription?.active
          },
          requests: {
            used: info.requests?.current,
            limit: info.requests?.limit,
            remaining:
              typeof info.requests?.current === "number" &&
              typeof info.requests?.limit === "number"
                ? Math.max(0, info.requests.limit - info.requests.current)
                : null
          }
        }, {
          headers: {
            ...corsHeaders,
            "Cache-Control": "no-store"
          }
        });

      } catch (error) {
        return Response.json(
          { error: "Usage check failed" },
          { status: 502, headers: corsHeaders }
        );
      }
    }

    // Load today's fixtures
    const date = url.searchParams.get("date") ||
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Casablanca",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        { error: "Invalid date. Use YYYY-MM-DD" },
        { status: 400, headers: corsHeaders }
      );
    }

    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = "/__mega_bet_cache/fixtures";
    cacheUrl.search = `?date=${date}`;

    const cacheKey = new Request(cacheUrl.toString());
    const cached = await cache.match(cacheKey);

    if (cached) {
      return new Response(cached.body, {
        status: cached.status,
        headers: {
          ...Object.fromEntries(cached.headers),
          ...corsHeaders,
          "X-MEGA-BET-CACHE": "HIT"
        }
      });
    }

    try {
      const apiUrl = new URL(
        "https://v3.football.api-sports.io/fixtures"
      );

      apiUrl.searchParams.set("date", date);
      apiUrl.searchParams.set("timezone", "Africa/Casablanca");

      const response = await fetch(apiUrl, {
        headers: {
          "x-apisports-key": env.API_FOOTBALL_KEY
        }
      });

      const data = await response.json();

      const limited = data.errors &&
        Object.keys(data.errors).some(key =>
          key.toLowerCase().includes("ratelimit")
        );

      const result = Response.json(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Cache-Control": limited
            ? "public, max-age=30"
            : "public, max-age=600"
        }
      });

      if (response.ok && !limited) {
        await cache.put(cacheKey, result.clone());
      } else if (limited) {
        await cache.put(cacheKey, result.clone());
      }

      return result;

    } catch (error) {
      return Response.json(
        { error: "Could not fetch football fixtures" },
        { status: 502, headers: corsHeaders }
      );
    }
  }
};
