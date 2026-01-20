// src/utils/sanitizeEmailBody.js
const API_URL = import.meta.env.VITE_API_BASE_URL;
export function cleanEmailBody(html = "", attachments = []) {
  if (!html) return "";

  // 🧩 Replace embedded CID references with real file URLs
  let updated = html;
  attachments.forEach((att) => {
    if (att.cid) {
      const fileUrl = att.url?.startsWith("http")
        ? att.url
        : `API_URL${att.url?.startsWith("/") ? att.url : `/${att.url}`}`;
      const cidRegex = new RegExp(`cid:${att.cid}`, "gi");
      updated = updated.replace(cidRegex, fileUrl);
    }
  });

  // 🧹 Remove tracking pixels / broken images
  return updated
    .replace(/<img[^>]+vialoops\.com[^>]+>/gi, "")
    .replace(/<img[^>]+mandrillapp\.com[^>]+>/gi, "")
    .replace(/<img[^>]+sendgrid\.net[^>]+>/gi, "")
    .replace(/<img[^>]+mailchimp\.com[^>]+>/gi, "")
    .replace(/<img[^>]+hubspot\.com[^>]+>/gi, "")
    .replace(/<img[^>]+sparkpostmail\.com[^>]+>/gi, "")
    .replace(/<img[^>]+(width=["']?1["']?|height=["']?1["']?)[^>]*>/gi, "")
    .replace(/<div>\s*<\/div>/g, "");
}
