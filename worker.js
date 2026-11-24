
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "GET") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: corsHeaders }
      );
    }

    if (url.pathname !== "/" && url.pathname !== "/fixtures") {
      return Response.json(
        { error: "Endpoint not found" },
        { status: 404, headers: corsHeaders }
      );
    }

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

    if (!env.API_FOOTBALL_KEY) {
      return Response.json(
        { error: "API key is not configured" },
        { status: 500, headers: corsHeaders }
      );
    }

    const cache = caches.default;
    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = "/__mega_bet_cache/fixtures";
    cacheUrl.search = `?date=${date}`;

    const cacheKey = new Request(cacheUrl.toString(), {
      method: "GET"
    });

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

      const isRateLimited =
        data.errors &&
        Object.keys(data.errors).some(key =>
          key.toLowerCase().includes("ratelimit")
        );

      const result = Response.json(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Cache-Control": isRateLimited
            ? "public, max-age=30"
            : "public, max-age=600",
          "X-MEGA-BET-CACHE": "MISS"
        }
      });

      // Cache successful results for 10 minutes.
      // Cache rate-limit errors briefly to avoid repeated requests.
      if (response.ok && !isRateLimited) {
        await cache.put(cacheKey, result.clone());
      } else if (isRateLimited) {
        const shortCache = Response.json(data, {
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=30"
          }
        });
        await cache.put(cacheKey, shortCache);
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
