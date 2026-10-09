import { timingSafeEqual } from "node:crypto";
import { getHostedApp, hostedEmailBatch } from "../backend/hosted-app.mjs";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.statusCode = 405;
    return response.end(JSON.stringify({ error: "Method not allowed." }));
  }
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.authorization || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (
    !secret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    response.statusCode = 401;
    return response.end(JSON.stringify({ error: "Unauthorized." }));
  }
  try {
    await getHostedApp().drainEmails(hostedEmailBatch);
    response.statusCode = 200;
    response.end(JSON.stringify({ ok: true }));
  } catch {
    console.error("Scheduled email processing failed.");
    response.statusCode = 503;
    response.end(
      JSON.stringify({ error: "Email processing is temporarily unavailable." }),
    );
  }
}
