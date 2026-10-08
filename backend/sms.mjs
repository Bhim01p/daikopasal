// Provider contract: https://docs.sparrowsms.com/sms/outgoing_sendsms/
// All credentials remain on the backend. Acceptance means queued, not delivered.
export function createSmsTransport(options = {}) {
  const env = options.env ?? process.env;
  const provider = options.provider ?? env.SMS_PROVIDER ?? "disabled";
  if (provider !== "sparrow") return null;
  const token = (options.token ?? env.SPARROW_SMS_TOKEN ?? "").trim();
  const sender = (options.sender ?? env.SPARROW_SMS_SENDER ?? "").trim();
  if (
    !token ||
    token.length > 512 ||
    /[\r\n]/.test(token) ||
    !/^[A-Za-z0-9_ -]{1,30}$/.test(sender)
  )
    return null;
  const fetchFn = options.fetchFn ?? fetch;
  return {
    provider: "sparrow",
    async sendOTP(phone, code) {
      if (!/^\+9779[78]\d{8}$/.test(phone) || !/^\d{6}$/.test(code))
        throw new Error("Invalid verification message.");
      const form = new URLSearchParams({
        token,
        from: sender,
        to: phone.slice(4),
        text: `Machhapuchhree Electronics: Your login code is ${code}. Expires in 5 minutes. Do not share this code.`,
      });
      try {
        const response = await fetchFn("https://api.sparrowsms.com/v2/sms/", {
          method: "POST",
          redirect: "error",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
          signal: AbortSignal.timeout(10000),
        });
        const result = await response.json();
        if (!response.ok || result.response_code !== 200 || result.count !== 1)
          throw new Error("Message not accepted.");
        return { accepted: true };
      } catch {
        // Never expose provider responses, credentials, recipients or codes.
        // No automatic retry: a timeout can happen after a billable acceptance.
        throw new Error(
          "SMS service could not accept the verification message.",
        );
      }
    },
  };
}
