import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFromAddress = "DeliciousRoute <no-reply@deliciousroute.com>";
const fromAddress = process.env.EMAIL_FROM || defaultFromAddress;

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
      text:
        "We received a request to reset your Delicious Route password.\n\n" +
        `You can choose a new password by visiting this link:\n${params.resetUrl}\n\n` +
        "If you didn't request this, you can ignore this email.",
    });
  } catch (error) {
    console.error("Error sending password reset email", error);
  }
}

export async function sendCustomerWelcomeEmail(params: {
  to: string;
  displayName?: string | null;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping customer welcome email.");
    return;
  }

  const namePart = params.displayName?.trim()
    ? `Hey ${params.displayName!.trim()},`
    : "Hey there,";

  try {
    await resend.emails.send({
      from: defaultFromAddress,
      to: params.to,
      subject: "Welcome to Delicious Route",
      text:
        `${namePart}\n\n` +
        "Welcome to Delicious Route – your guide to the best food trucks around you.\n\n" +
        "You can now save favorite trucks, explore reels, and personalize your profile so we can surface the right vendors for you.\n\n" +
        "Thanks for joining the Delicious Route community!",
      html:
        `<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 16px; color: #212121; line-height: 1.5;">` +
        `<p style="margin: 0 0 16px;">${namePart}</p>` +
        `<p style="margin: 0 0 16px;">Welcome to <strong>Delicious Route</strong> – your guide to the best food trucks around you.</p>` +
        `<p style="margin: 0 0 16px;">You can now save your favorite trucks, explore reels, and personalize your profile so we can surface the right vendors for you.</p>` +
        `<p style="margin: 0 0 16px;">Thanks for joining the Delicious Route community!</p>` +
        `<p style="margin: 0; font-size: 13px; color: #757575;">If you didn't create this account, you can safely ignore this email.</p>` +
        `</div>`,
    });
  } catch (error) {
    console.error("Error sending customer welcome email", error);
  }
}

export async function sendVendorWelcomeEmail(params: {
  to: string;
  vendorName?: string | null;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping vendor welcome email.");
    return;
  }

  const namePart = params.vendorName?.trim()
    ? `Hey ${params.vendorName!.trim()} team,`
    : "Hey there,";

  try {
    await resend.emails.send({
      from: defaultFromAddress,
      to: params.to,
      subject: "Welcome to Delicious Route for Vendors",
      text:
        `${namePart}\n\n` +
        "Welcome to Delicious Route – we're excited to help you reach more hungry customers.\n\n" +
        "You can now set up your vendor profile, add menus and photos, and keep your GPS/location updated so fans can always find you.\n\n" +
        "Thanks for partnering with Delicious Route!",
      html:
        `<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 16px; color: #212121; line-height: 1.5;">` +
        `<p style="margin: 0 0 16px;">${namePart}</p>` +
        `<p style="margin: 0 0 16px;">Welcome to <strong>Delicious Route</strong> – we're excited to help you reach more hungry customers.</p>` +
        `<p style="margin: 0 0 16px;">You can now set up your vendor profile, add menus and photos, and keep your GPS/location updated so fans can always find you.</p>` +
        `<p style="margin: 0 0 16px;">Thanks for partnering with Delicious Route!</p>` +
        `<p style="margin: 0; font-size: 13px; color: #757575;">If you didn't create this vendor account, you can safely ignore this email.</p>` +
        `</div>`,
    });
  } catch (error) {
    console.error("Error sending vendor welcome email", error);
  }
}
