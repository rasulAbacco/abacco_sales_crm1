export function normalizeEmailHtml(html) {
  if (!html || typeof html !== "string") return "";

  let cleaned = html;

  cleaned = cleaned
    .replace(/<o:p>\s*<\/o:p>/gi, "")
    .replace(/<o:p>.*?<\/o:p>/gi, "")
    .replace(/\sclass=["']?Mso[a-zA-Z0-9]+["']?/gi, "");

  cleaned = cleaned.replace(
    /<(p|div)[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi,
    "<br>",
  );

  cleaned = cleaned.replace(
    /<p(?![^>]*style=)([^>]*)>/gi,
    `<p$1 style="margin:0 0 4px 0;line-height:1.15;font-family:Calibri,Arial,sans-serif;font-size:11pt;">`,
  );

  return cleaned.trim();
}