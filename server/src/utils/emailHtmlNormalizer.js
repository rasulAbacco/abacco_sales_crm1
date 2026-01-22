// server/src/utils/emailHtmlNormalizer.js

export function normalizeEmailHtml(html) {
  if (!html || typeof html !== "string") return "";

  let cleaned = html;

  // 1️⃣ Remove Outlook-specific junk (auto spacing, not user intent)
  cleaned = cleaned
    .replace(/<o:p>\s*<\/o:p>/gi, "")
    .replace(/<o:p>.*?<\/o:p>/gi, "")
    .replace(/\sclass=["']?Mso[a-zA-Z0-9]+["']?/gi, "");

  // 2️⃣ Remove ONLY Outlook-generated empty blocks
  // ❌ <p>&nbsp;</p>
  // ❌ <div><br></div>
  // ✅ Keep <p></p> (user pressed Enter)
  cleaned = cleaned.replace(
    /<(p|div)[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi,
    "",
  );

  // 3️⃣ Normalize paragraph style (Outlook-like)
  cleaned = cleaned.replace(
    /<p([^>]*)>/gi,
    `<p$1 style="margin:0 0 12px 0;line-height:1.15;font-family:Calibri,Arial,sans-serif;font-size:11pt;">`,
  );

  // 4️⃣ IMPORTANT: DO NOT touch <br><br>
  // (user-added spacing must survive)

  return cleaned.trim();
}
