// Vercel Serverless Function: GET /api/feedback-results
// GET  — fetches the aggregated feedback counts from Google Apps Script.
// Acts as a proxy to avoid browser CORS restrictions with GAS /exec endpoints.

export default async function handler(request, response) {
  const gasUrl = (
    process.env.VITE_GAS_URL ||
    process.env.GAS_URL ||
    ""
  ).trim();

  if (!gasUrl) {
    return response
      .status(500)
      .json({ error: "Feedback Google Apps Script URL is not configured" });
  }

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
        .json({ error: "Unable to fetch feedback results from Google Sheets" });
    }
  }

  return response.status(405).json({ error: "Method not allowed" });
}
