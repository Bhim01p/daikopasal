import { Readable } from "node:stream";
import { waitUntil } from "@vercel/functions";
import { getHostedApp, hostedEmailBatch } from "../backend/hosted-app.mjs";

export default async function handler(request, response) {
  try {
    const app = getHostedApp();
    // Vercel's Node helper may already have consumed/parsed the request body.
    // Pass a stream containing the same bytes to the existing backend handler.
    let input = request;
    if (request.body !== undefined && request.body !== null) {
      const data = Buffer.isBuffer(request.body)
        ? request.body
        : typeof request.body === "string"
          ? Buffer.from(request.body)
          : Buffer.from(JSON.stringify(request.body));
      input = Readable.from([data]);
      input.headers = request.headers;
      input.socket = request.socket;
      input.method = request.method;
    }
    const url = new URL(request.url, "https://prototype.invalid");
    const route = request.query?.route || url.searchParams.get("route");
    input.url = route
      ? `/api/${Array.isArray(route) ? route.join("/") : route}`
      : url.pathname;
    // Vercel supplies x-real-ip at its trusted ingress; local clients cannot set
    // this property because the normal Node server does not consume this header.
    input.clientIp =
      request.headers["x-real-ip"] || request.socket?.remoteAddress;
    await app.handle(input, response);
    waitUntil(
      app
        .drainEmails(hostedEmailBatch)
        .catch(() => console.error("Email queue could not be processed.")),
    );
  } catch {
    if (!response.headersSent) {
      response.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      response.end(
        JSON.stringify({
          error: "The shop is temporarily unavailable. Please try again.",
        }),
      );
    }
  }
}
