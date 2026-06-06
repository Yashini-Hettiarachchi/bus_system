// Vercel Serverless Function: POST /api/feedback
// Receives bus feedback answers from the client and forwards them to the
// Google Apps Script /exec endpoint as application/x-www-form-urlencoded.
// This avoids browser CORS limitations and allows explicit success/failure.

const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];

function toFormBody(payload) {
  const form = new URLSearchParams();

  form.set("sessionId", payload?.sessionId || "");
  form.set("language", payload?.language || "en");

  for (const key of QUESTION_KEYS) {
    form.set(key, payload?.[key] || "");
  }

  return form;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const payload = request.body && typeof request.body === "object" ? request.body : {};

  // Prefer server env value; allow client-provided fallback for local testing.
  const gasUrl = (process.env.VITE_GAS_URL || process.env.GAS_URL || payload.gasUrl || "").trim();
  if (!gasUrl) {
    return response.status(500).json({ error: "Google Apps Script URL is not configured" });
  }

  try {
    const upstream = await fetch(gasUrl, {
      method: "POST",
      body: toFormBody(payload),
      redirect: "follow",
    });

    // GAS /exec usually returns 200 with text/json body.
    if (!upstream.ok) {
      return response.status(502).json({ error: `GAS request failed (${upstream.status})` });
    }

    return response.status(200).json({ ok: true });
  } catch {
    return response.status(502).json({ error: "Unable to forward feedback to Google Sheets" });
  }
}
