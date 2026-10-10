// Sends the password-reset email. With SMTP_* env vars set it uses nodemailer;
// otherwise it logs the link to the server console (fine for local development).
export async function sendResetEmail(to, link) {
  if (!process.env.SMTP_HOST) {
    console.log(`[mail] (SMTP not configured) password reset link for ${to}: ${link}`);
    return { sent: false };
  }
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || "AIVerse Inc. <no-reply@aiverse.local>",
    to,
    subject: "Reset your AIVerse password",
    text: `Use this link to choose a new password (valid for 1 hour):\n\n${link}\n\nIf you didn't ask for this, ignore this email.`,
  });
  return { sent: true };
}
