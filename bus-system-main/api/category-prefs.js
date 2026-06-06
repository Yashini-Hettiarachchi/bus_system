// Vercel Serverless Function: GET + POST /api/category-prefs
// GET  — fetches the latest category preference counts from Google Apps Script.
// POST — saves the current session's category preferences to Google Apps Script.
// Acts as a proxy to avoid browser CORS restrictions with GAS /exec endpoints.

export default async function handler(request, response) {
  const gasUrl = (
    process.env.VITE_GAS_PREFS_URL ||
    process.env.GAS_PREFS_URL ||
    ""
  ).trim();

  if (!gasUrl) {
    return response
      .status(500)
      .json({ error: "Category prefs Google Apps Script URL is not configured" });
  }

  // ── GET: fetch latest preference counts from the sheet ──────────────────────
  if (request.method === "GET") {
    try {
      const upstream = await fetch(gasUrl, { redirect: "follow" });

      if (!upstream.ok) {
        return response
          .status(502)
          .json({ error: `GAS GET failed (${upstream.status})` });
      }

      const data = await upstream.json();
      return response.status(200).json(data);
    } catch {
      return response
        .status(502)
        .json({ error: "Unable to fetch category prefs from Google Sheets" });
    }
  }

  // ── POST: save current session preferences to the sheet ────────────────────
  if (request.method === "POST") {
    const payload =
      request.body && typeof request.body === "object" ? request.body : {};

    try {
      const upstream = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });

      if (!upstream.ok) {
        return response
          .status(502)
          .json({ error: `GAS POST failed (${upstream.status})` });
      }

      return response.status(200).json({ ok: true });
    } catch {
      return response
        .status(502)
        .json({ error: "Unable to save category prefs to Google Sheets" });
    }
  }

  return response.status(405).json({ error: "Method not allowed" });
}
