
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

    if (!env.API_FOOTBALL_KEY) {
      return Response.json(
        { error: "API key is not configured" },
        { status: 500, headers: corsHeaders }
      );
    }

    if (url.pathname !== "/" && url.pathname !== "/fixtures") {
      return Response.json(
        { error: "Endpoint not found. Use /fixtures" },
        { status: 404, headers: corsHeaders }
      );
    }

    const date = url.searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        { error: "Date must be YYYY-MM-DD" },
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      const apiUrl = new URL(
        "https://v3.football.api-sports.io/fixtures"
      );

      apiUrl.searchParams.set("date", date);
      apiUrl.searchParams.set("timezone", "Africa/Casablanca");

      const response = await fetch(apiUrl, {
        headers: {
          "x-apisports-key": env.API_FOOTBALL_KEY,
        },
      });

      const data = await response.json();

      return Response.json(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store",
        },
      });

    } catch (error) {
      return Response.json(
        { error: "Could not fetch football fixtures" },
        { status: 502, headers: corsHeaders }
      );
    }
  },
};
