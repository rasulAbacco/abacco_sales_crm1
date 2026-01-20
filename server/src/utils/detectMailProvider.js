// src/utils/detectMailProvider.js
import dns from "dns/promises";

/**
 * Detect mail service provider based on MX records.
 */
export async function detectMailProvider(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  try {
    // 1️⃣ Fetch live MX records for domain (like mxtoolbox)
    const mxRecords = await dns.resolveMx(domain);
    const mxHosts = mxRecords.map((r) => r.exchange.toLowerCase());

    // 2️⃣ Match known providers
    if (mxHosts.some((h) => h.includes("google.com"))) {
      return {
        provider: "gmail",
        message: "Detected Gmail / Google Workspace",
        imapHost: "imap.gmail.com",
        imapPort: 993,
        smtpHost: "smtp.gmail.com",
        smtpPort: 465,
        ssl: true,
      };
    }
    if (mxHosts.some((h) => h.includes("zoho"))) {
      return {
        provider: "zoho",
        message: "Detected Zoho Mail",
        imapHost: "imap.zoho.com",
        imapPort: 993,
        smtpHost: "smtp.zoho.com",
        smtpPort: 465,
        ssl: true,
      };
    }
    if (mxHosts.some((h) => h.includes("titan.email"))) {
      return {
        provider: "bluehost",
        message: "Detected Titan / Bluehost",
        imapHost: "imap.titan.email",
        imapPort: 993,
        smtpHost: "smtp.titan.email",
        smtpPort: 465,
        ssl: true,
      };
    }
    if (mxHosts.some((h) => h.includes("outlook") || h.includes("protection.outlook.com"))) {
      return {
        provider: "outlook",
        message: "Detected Outlook / Office 365",
        imapHost: "outlook.office365.com",
        imapPort: 993,
        smtpHost: "smtp.office365.com",
        smtpPort: 587,
        ssl: false,
      };
    }

    // 3️⃣ Unknown or private domain
    return {
      provider: "custom",
      message: `Unrecognized domain (${domain})`,
      mxRecords: mxHosts,
      note: "Custom mail server detected — please verify IMAP/SMTP manually.",
    };
  } catch (err) {
    console.error("⚠️ MX lookup failed:", err.message);
    return {
      provider: "unknown",
      message: "MX lookup failed",
      note: "Could not resolve MX records for this domain.",
    };
  }
}
