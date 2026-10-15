import nodemailer from "nodemailer";

export function createGmailTransport(
  env,
  factory = nodemailer.createTransport,
) {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return null;
  const user = env.GMAIL_USER.trim();
  const password = env.GMAIL_APP_PASSWORD.replace(/\s/g, "");
  if (
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(user) ||
    !/^[a-zA-Z0-9]{16}$/.test(password)
  )
    throw new Error(
      "Gmail requires an email address and a 16-character app password.",
    );
  const from = env.EMAIL_FROM || `Machhapuchhree Electronics <${user}>`;
  if (/[\r\n]/.test(from) || /[\r\n]/.test(env.EMAIL_REPLY_TO || ""))
    throw new Error("Email sender configuration must not contain newlines.");
  const sender = from.match(/<([^<>]+)>$/)?.[1] || from;
  if (sender.toLowerCase() !== user.toLowerCase())
    throw new Error("The Gmail sender must match GMAIL_USER.");
  const smtp = factory({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  return {
    provider: "gmail",
    supportsIdempotency: false,
    from,
    replyTo: env.EMAIL_REPLY_TO || undefined,
    verify: () => smtp.verify(),
    async send(message, id) {
      try {
        const result = await smtp.sendMail({
          from: message.from || from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
          attachments: (message.attachments || []).map((attachment) => ({
            filename: attachment.filename,
            content: Buffer.from(attachment.content, "base64"),
            contentType: attachment.content_type,
          })),
          replyTo: message.reply_to,
          messageId: `<order-email.${id}@gmail.com>`,
        });
        if (!result.accepted?.length) {
          const rejection = new Error("Gmail rejected the recipient.");
          rejection.permanent = true;
          throw rejection;
        }
        return result.messageId;
      } catch (cause) {
        // SMTP has no provider idempotency key. An interrupted DATA exchange may
        // have been accepted; stop automatic retries until the owner reviews it.
        const definitelyRejected =
          Number.isInteger(cause.responseCode) ||
          [
            "CONN",
            "EHLO",
            "HELO",
            "STARTTLS",
            "AUTH",
            "MAIL FROM",
            "RCPT TO",
          ].some((command) => cause.command?.startsWith(command)) ||
          cause.code === "EAUTH";
        const uncertain = !definitelyRejected && !cause.permanent;
        const error = new Error(
          uncertain
            ? "Gmail delivery is uncertain. Check Gmail and the recipient before manually retrying this email."
            : "Gmail rejected the email. Check the app password, sender and recipient.",
        );
        error.permanent =
          uncertain ||
          !!cause.permanent ||
          cause.code === "EAUTH" ||
          cause.responseCode >= 500;
        throw error;
      }
    },
  };
}
