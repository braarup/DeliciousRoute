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

export async function sendVendorProfileChangeEmail(params: {
  to: string;
  vendorName?: string | null;
  changes: string[];
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping vendor profile change email.");
    return;
  }

  const safeChanges = Array.isArray(params.changes)
    ? params.changes.filter((c) => typeof c === "string" && c.trim().length > 0)
    : [];

  if (safeChanges.length === 0) {
    // Nothing meaningful to report
    return;
  }

  const namePart = params.vendorName?.trim()
    ? `${params.vendorName!.trim()} team`
    : "there";

  const securityUrl =
    process.env.NEXT_PUBLIC_SECURITY_URL ||
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    "https://deliciousroute.app/security";

  const changesText = safeChanges.map((c) => `- ${c}`).join("\n");
  const changesHtml = safeChanges
    .map((c) => `<li>${c}</li>`)
    .join("");

  const securityParagraphText =
    "If you didn't make these changes, please log into your Delicious Route vendor account and change your password immediately. " +
    "We also recommend reviewing your login activity and active sessions. " +
    "You can report this incident here: " + securityUrl;

  const securityParagraphHtml =
    `<p style="margin: 0 0 16px; font-size: 13px; color: #d32f2f;">` +
    `If you didn't make these changes, please <strong>log into your Delicious Route vendor account</strong> and change your password immediately. ` +
    `We also recommend reviewing your login activity and active sessions. ` +
    `You can report this incident here: <a href="${securityUrl}" style="color: #1976d2; text-decoration: underline;">Report a security issue</a>.` +
    `</p>`;

  try {
    await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject: "Your Delicious Route vendor profile was updated",
      text:
        `Hi ${namePart},` +
        "\n\n" +
        "The following changes were just made to your Delicious Route vendor profile:" +
        "\n\n" +
        `${changesText}` +
        "\n\n" +
        securityParagraphText +
        "\n\n" +
        "If this all looks correct, you don't need to take any action.\n\n" +
        "Thanks for partnering with Delicious Route!",
      html:
        `<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #212121; line-height: 1.5;">` +
        `<p style="margin: 0 0 16px;">Hi ${namePart},</p>` +
        `<p style="margin: 0 0 12px;">The following changes were just made to your <strong>Delicious Route</strong> vendor profile:</p>` +
        `<ul style="margin: 0 0 16px 20px; padding: 0;">${changesHtml}</ul>` +
        securityParagraphHtml +
        `<p style="margin: 16px 0 0; font-size: 13px; color: #757575;">If this all looks correct, you don't need to take any action.</p>` +
        `<p style="margin: 8px 0 0; font-size: 13px; color: #757575;">Thanks for partnering with Delicious Route!</p>` +
        `</div>`,
    });
  } catch (error) {
    console.error("Error sending vendor profile change email", error);
  }
}

export async function sendCustomerProfileChangeEmail(params: {
  to: string;
  displayName?: string | null;
  changes: string[];
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping customer profile change email.");
    return;
  }

  const safeChanges = Array.isArray(params.changes)
    ? params.changes.filter((c) => typeof c === "string" && c.trim().length > 0)
    : [];

  if (safeChanges.length === 0) {
    return;
  }

  const namePart = params.displayName?.trim()
    ? params.displayName!.trim()
    : "there";

  const securityUrl =
    process.env.NEXT_PUBLIC_SECURITY_URL ||
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    "https://deliciousroute.app/security";

  const changesText = safeChanges.map((c) => `- ${c}`).join("\n");
  const changesHtml = safeChanges.map((c) => `<li>${c}</li>`).join("");

  const securityParagraphText =
    "If you didn't make these changes, please log into your Delicious Route account and change your password immediately. " +
    "We also recommend reviewing your login activity and active sessions. " +
    "You can report this incident here: " + securityUrl;

  const securityParagraphHtml =
    `<p style="margin: 0 0 16px; font-size: 13px; color: #d32f2f;">` +
    `If you didn't make these changes, please <strong>log into your Delicious Route account</strong> and change your password immediately. ` +
    `We also recommend reviewing your login activity and active sessions. ` +
    `You can report this incident here: <a href="${securityUrl}" style="color: #1976d2; text-decoration: underline;">Report a security issue</a>.` +
    `</p>`;

  try {
    await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject: "Your Delicious Route profile was updated",
      text:
        `Hi ${namePart},` +
        "\n\n" +
        "The following changes were just made to your Delicious Route profile preferences:" +
        "\n\n" +
        `${changesText}` +
        "\n\n" +
        securityParagraphText +
        "\n\n" +
        "If this all looks correct, you don't need to take any action.\n\n" +
        "Thanks for being part of the Delicious Route community!",
      html:
        `<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #212121; line-height: 1.5;">` +
        `<p style="margin: 0 0 16px;">Hi ${namePart},</p>` +
        `<p style="margin: 0 0 12px;">The following changes were just made to your <strong>Delicious Route</strong> profile preferences:</p>` +
        `<ul style="margin: 0 0 16px 20px; padding: 0;">${changesHtml}</ul>` +
        securityParagraphHtml +
        `<p style="margin: 16px 0 0; font-size: 13px; color: #757575;">If this all looks correct, you don't need to take any action.</p>` +
        `<p style="margin: 8px 0 0; font-size: 13px; color: #757575;">Thanks for being part of the Delicious Route community!</p>` +
        `</div>`,
    });
  } catch (error) {
    console.error("Error sending customer profile change email", error);
  }
}

export async function sendSecurityIncidentReportEmail(params: {
  reporterEmail?: string | null;
  reporterName?: string | null;
  accountEmail?: string | null;
  role?: "vendor" | "customer" | "other" | null;
  category: string;
  description: string;
  firstNoticedAt?: string | null;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping security incident report email.");
    return;
  }

  const securityTo =
    process.env.SECURITY_REPORT_TO ||
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_FROM ||
    "security@deliciousroute.app";

  const clean = (value: string | null | undefined) =>
    (value || "").toString().trim();

  const reporterEmail = clean(params.reporterEmail);
  const reporterName = clean(params.reporterName);
  const accountEmail = clean(params.accountEmail);
  const firstNoticedAt = clean(params.firstNoticedAt);
  const role = params.role || null;
  const category = clean(params.category) || "Unspecified";
  const description = clean(params.description);

  const roleLabel = role === "vendor" ? "Vendor" : role === "customer" ? "Customer" : "Other / Not specified";

  const lines: string[] = [];
  lines.push("A new security incident was reported from the Delicious Route app.");
  lines.push("");
  lines.push(`Category: ${category}`);
  lines.push(`Role: ${roleLabel}`);
  if (accountEmail) {
    lines.push(`Account email: ${accountEmail}`);
  }
  if (reporterName) {
    lines.push(`Reporter name: ${reporterName}`);
  }
  if (reporterEmail) {
    lines.push(`Reporter email: ${reporterEmail}`);
  }
  if (firstNoticedAt) {
    lines.push(`First noticed at: ${firstNoticedAt}`);
  }
  lines.push("");
  lines.push("Description:");
  lines.push(description || "(No additional description provided.)");

  const textBody = lines.join("\n");

  try {
    await resend.emails.send({
      from: fromAddress,
      to: securityTo,
      subject: "New security incident report",
      text: textBody,
    });
  } catch (error) {
    console.error("Error sending security incident report email", error);
  }
}
