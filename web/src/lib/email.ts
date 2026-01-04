import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || "no-reply@deliciousroute.com";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping email send. Reset URL:", params.resetUrl);
    return;
  }

  try {
    await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject: "Reset your Delicious Route password",
      text: `We received a request to reset your Delicious Route password.\n\n`
        + `You can choose a new password by visiting this link:\n${params.resetUrl}\n\n`
        + "If you didn\"t request this, you can ignore this email.",
    });
  } catch (error) {
    console.error("Error sending password reset email", error);
  }
}
