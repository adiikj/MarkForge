import { Resend } from "resend";

// Sends via Resend when RESEND_API_KEY is set; otherwise prints the email (and its link) to the
// console so every flow works in development.

const FROM = process.env.EMAIL_FROM || "MarkForge <onboarding@resend.dev>";
let client: Resend | null = null;

const layout = (heading: string, body: string, cta: { label: string; url: string }, footer: string) => `<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td style="font-size:16px;font-weight:700;color:#0a0a0a;padding-bottom:24px">MarkForge</td></tr>
      <tr><td style="font-size:20px;font-weight:600;color:#0a0a0a;padding-bottom:12px">${heading}</td></tr>
      <tr><td style="font-size:14px;line-height:22px;color:#404040;padding-bottom:24px">${body}</td></tr>
      <tr><td style="padding-bottom:24px"><a href="${cta.url}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px">${cta.label}</a></td></tr>
      <tr><td style="font-size:12px;line-height:18px;color:#737373">${footer}<br><br>Or paste this link into your browser:<br><span style="word-break:break-all">${cta.url}</span></td></tr>
    </table>
  </td></tr></table>
</body></html>`;

const send = async (to: string, subject: string, html: string, text: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[mail] (RESEND_API_KEY not set, not sent)\n  to: ${to}\n  subject: ${subject}\n  ${text.replace(/\n/g, "\n  ")}\n`);
    return;
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await client.emails.send({ from: FROM, to, subject, html, text });
  if (error) {
    // Don't fail the user's request because of email delivery; log it for the operator.
    console.error(`[mail] failed to send "${subject}" to ${to}:`, error.message);
  }
};

export const sendVerificationEmail = (to: string, url: string) =>
  send(
    to,
    "Verify your MarkForge email",
    layout("Confirm your email", "Thanks for signing up! Confirm this is your email address to finish setting up your account.", { label: "Verify email", url }, "This link expires in 24 hours. If you didn't create a MarkForge account, you can ignore this email."),
    `Confirm your email: ${url}\n\nThis link expires in 24 hours.`
  );

export const sendPasswordResetEmail = (to: string, url: string) =>
  send(
    to,
    "Reset your MarkForge password",
    layout("Reset your password", "Someone (hopefully you) asked to reset the password for your MarkForge account.", { label: "Choose a new password", url }, "This link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email and your password won't change."),
    `Reset your password: ${url}\n\nThis link expires in 1 hour.`
  );
