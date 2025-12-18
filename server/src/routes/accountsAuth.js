// server/routes/accountsAuth.js
import express from "express";
import axios from "axios";

const router = express.Router();

/* =============================================
   ⚙️  OUTLOOK (Office 365) AUTHENTICATION FLOW
   ============================================= */

// Microsoft OAuth scopes
const OUTLOOK_SCOPES = [
  "offline_access",
  "openid",
  "email",
  "profile",
  "https://outlook.office365.com/IMAP.AccessAsUser.All",
  "https://outlook.office365.com/SMTP.Send",
];

const OUTLOOK_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

/* ============================================================
   ✅ Step 1: Generate Outlook OAuth Login URL
   ============================================================ */
// router.get("/outlook/auth-url", (req, res) => {
//   try {
//     const { clientId, redirectUri } = req.query;
//     if (!clientId || !redirectUri) {
//       return res.status(400).json({ error: "Missing clientId or redirectUri" });
//     }

//     const params = new URLSearchParams({
//       client_id: clientId,
//       response_type: "code",
//       redirect_uri: redirectUri,
//       response_mode: "query",
//       scope: OUTLOOK_SCOPES.join(" "),
//     });

//     const authUrl = `${OUTLOOK_AUTH_URL}?${params.toString()}`;
//     res.json({ url: authUrl });
//   } catch (err) {
//     console.error("❌ Error generating Outlook auth URL:", err.message);
//     res.status(500).json({ error: "Failed to generate auth URL" });
//   }
// });

/* ============================================================
   ✅ Step 2: Exchange Authorization Code for Tokens
   ============================================================ */
// router.get("/outlook/callback", async (req, res) => {
//   try {
//     const { code, clientId, clientSecret, redirectUri } = req.query;
//     if (!code || !clientId || !clientSecret || !redirectUri) {
//       return res.status(400).json({ error: "Missing parameters" });
//     }

//     const params = new URLSearchParams({
//       client_id: clientId,
//       client_secret: clientSecret,
//       grant_type: "authorization_code",
//       code,
//       redirect_uri: redirectUri,
//       scope: OUTLOOK_SCOPES.join(" "),
//     });

//     const response = await axios.post(OUTLOOK_TOKEN_URL, params.toString(), {
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     });

//     const { access_token, refresh_token, expires_in } = response.data;
//     res.json({
//       message: "✅ Outlook OAuth tokens received",
//       accessToken: access_token,
//       refreshToken: refresh_token,
//       expiresIn: expires_in,
//     });
//   } catch (err) {
//     console.error("❌ Outlook token exchange failed:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to exchange Outlook OAuth tokens" });
//   }
// });

/* ============================================================
   ✅ Step 3: Refresh Access Token using Refresh Token
   ============================================================ */
// router.post("/outlook/refresh", async (req, res) => {
//   try {
//     const { refreshToken, clientId, clientSecret } = req.body;
//     if (!refreshToken || !clientId || !clientSecret) {
//       return res.status(400).json({ error: "Missing refreshToken or credentials" });
//     }

//     const params = new URLSearchParams({
//       client_id: clientId,
//       client_secret: clientSecret,
//       grant_type: "refresh_token",
//       refresh_token: refreshToken,
//       scope: OUTLOOK_SCOPES.join(" "),
//     });

//     const response = await axios.post(OUTLOOK_TOKEN_URL, params.toString(), {
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     });

//     const { access_token, expires_in } = response.data;
//     res.json({
//       message: "✅ Outlook access token refreshed",
//       accessToken: access_token,
//       expiresIn: expires_in,
//     });
//   } catch (err) {
//     console.error("❌ Outlook token refresh failed:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to refresh Outlook access token" });
//   }
// });

/* ============================================================
   ✅ Your active setup doesn’t require OAuth.
   All email providers (Gmail, GSuite, Zoho, Bluehost)
   use IMAP + SMTP with passwords or app passwords.
   ============================================================ */

router.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "Outlook authentication endpoints are disabled. Use password-based IMAP/SMTP for Gmail, Zoho, GSuite, and Bluehost.",
  });
});


export default router;











// // server/routes/accountsAuth.js
// import express from "express";
// import axios from "axios";
// import { google } from "googleapis";

// const router = express.Router();

// // === IMPORTANT: put your real client id/secret or prefer using process.env ===
// // Example: process.env.GOOGLE_CLIENT_ID etc.
// const CLIENT_ID = process.env.OAUTH_DEFAULT_CLIENT_ID || "";
// const CLIENT_SECRET = process.env.OAUTH_DEFAULT_CLIENT_SECRET || "";
// const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || "https://www.bouncecure.com/contacts";

// // Google scopes (keep as you had)
// const SCOPES = [
//   "https://mail.google.com/",
//   "https://www.googleapis.com/auth/gmail.readonly",
//   "https://www.googleapis.com/auth/gmail.modify",
// ];

// // Outlook (Microsoft) scopes and endpoints (existing pattern)
// const OUTLOOK_SCOPES = [
//   "offline_access",
//   "openid",
//   "email",
//   "profile",
//   "https://outlook.office365.com/IMAP.AccessAsUser.All",
//   "https://outlook.office365.com/SMTP.Send",
// ];



// const OUTLOOK_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
// const OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

// const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// // --------------------- Helpers (token refreshers) ---------------------

// // Google: reuse existing pattern
// export async function getOAuth2AccessToken(account) {
//   const oAuth2Client = new google.auth.OAuth2(account.oauthClientId || CLIENT_ID, account.oauthClientSecret || CLIENT_SECRET);
//   oAuth2Client.setCredentials({ refresh_token: account.refreshToken });
//   const { token } = await oAuth2Client.getAccessToken();
//   return token;
// }

// // Zoho
// export async function getZohoAccessToken(refreshToken, clientId, clientSecret) {
//   try {
//     const response = await axios.post(
//       "https://accounts.zoho.com/oauth/v2/token",
//       new URLSearchParams({
//         grant_type: "refresh_token",
//         refresh_token: refreshToken,
//         client_id: clientId,
//         client_secret: clientSecret,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     return response.data.access_token;
//   } catch (err) {
//     console.error("❌ Error refreshing Zoho token:", err.response?.data || err.message);
//     throw new Error("Failed to refresh Zoho access token");
//   }
// }

// // Rediff
// export async function getRediffAccessToken(refreshToken, clientId, clientSecret) {
//   try {
//     const response = await axios.post(
//       "https://accounts.rediff.com/oauth2/token",
//       new URLSearchParams({
//         grant_type: "refresh_token",
//         refresh_token: refreshToken,
//         client_id: clientId,
//         client_secret: clientSecret,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     return response.data.access_token;
//   } catch (err) {
//     console.error("❌ Error refreshing Rediff token:", err.response?.data || err.message);
//     throw new Error("Failed to refresh Rediff access token");
//   }
// }

// // ---------- NEW: Yahoo helpers (auth URL, exchange code, refresh token) ----------
// export async function getYahooAccessToken(refreshToken, clientId, clientSecret) {
//   try {
//     const response = await axios.post(
//       "https://api.login.yahoo.com/oauth2/get_token",
//       new URLSearchParams({
//         grant_type: "refresh_token",
//         refresh_token: refreshToken,
//       }),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//           "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
//         },
//       }
//     );
//     return response.data.access_token;
//   } catch (err) {
//     console.error("❌ Yahoo token refresh failed:", err.response?.data || err.message);
//     throw new Error("Failed to refresh Yahoo access token");
//   }
// }

// // --------------------- OAuth routes (auth-url + callback) ---------------------

// // Google: existing
// router.get("/google/auth-url", (req, res) => {
//   const url = oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     prompt: "consent",
//     scope: SCOPES,
//   });
//   res.json({ url });
// });

// router.get("/google/callback", async (req, res) => {
//   const code = req.query.code;
//   if (!code) return res.status(400).json({ error: "Missing authorization code" });
//   try {
//     const { tokens } = await oauth2Client.getToken(code);
//     res.json({
//       message: "OAuth2 tokens received",
//       refreshToken: tokens.refresh_token,
//       accessToken: tokens.access_token,
//       expiryDate: tokens.expiry_date,
//     });
//   } catch (err) {
//     console.error("❌ Error exchanging Google code:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to exchange code" });
//   }
// });

// // Zoho: existing pattern
// router.get("/zoho/auth-url", (req, res) => {
//   const { clientId } = req.query;
//   if (!clientId) return res.status(400).json({ error: "Client ID is required" });
//   const url = `https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=ZohoMail.accounts.READ,ZohoMail.messages.ALL,ZohoMail.folders.READ,ZohoMail.settings.ALL&access_type=offline`;
//   res.json({ url });
// });
// router.get("/zoho/callback", async (req, res) => {
//   const { code, clientId, clientSecret } = req.query;
//   if (!code || !clientId || !clientSecret) return res.status(400).json({ error: "Missing parameters" });
//   try {
//     const response = await axios.post(
//       "https://accounts.zoho.com/oauth/v2/token",
//       new URLSearchParams({
//         grant_type: "authorization_code",
//         code,
//         redirect_uri: REDIRECT_URI,
//         client_id: clientId,
//         client_secret: clientSecret,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     const { access_token, refresh_token } = response.data;
//     res.json({ message: "OAuth2 tokens received", refreshToken: refresh_token, accessToken: access_token });
//   } catch (err) {
//     console.error("❌ Error exchanging Zoho code:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to exchange code" });
//   }
// });

// // Rediff: existing pattern
// router.get("/rediff/auth-url", (req, res) => {
//   const { clientId } = req.query;
//   if (!clientId) return res.status(400).json({ error: "Client ID is required" });
//   const url = `https://accounts.rediff.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=mail`;
//   res.json({ url });
// });
// router.get("/rediff/callback", async (req, res) => {
//   const { code, clientId, clientSecret } = req.query;
//   if (!code || !clientId || !clientSecret) return res.status(400).json({ error: "Missing parameters" });
//   try {
//     const response = await axios.post(
//       "https://accounts.rediff.com/oauth2/token",
//       new URLSearchParams({
//         grant_type: "authorization_code",
//         code,
//         redirect_uri: REDIRECT_URI,
//         client_id: clientId,
//         client_secret: clientSecret,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     const { access_token, refresh_token } = response.data;
//     res.json({ message: "OAuth2 tokens received", refreshToken: refresh_token, accessToken: access_token });
//   } catch (err) {
//     console.error("❌ Error exchanging Rediff code:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to exchange code" });
//   }
// });

// // ---------- Yahoo: auth URL and callback (NEW) ----------
// router.get("/yahoo/auth-url", (req, res) => {
//   // Prefer passing clientId & redirectUri from frontend to support per-app config
//   const { clientId, redirectUri } = req.query;
//   const cid = clientId || CLIENT_ID;
//   const ruri = redirectUri || REDIRECT_URI;
//   if (!cid) return res.status(400).json({ error: "Client ID required" });

//   // Yahoo request_auth endpoint (user consent)
//   const url = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${cid}&redirect_uri=${encodeURIComponent(ruri)}&response_type=code&language=en-us`;
//   res.json({ url });
// });

// router.get("/yahoo/callback", async (req, res) => {
//   // This exchanges code for tokens. Frontend should forward code, clientId & clientSecret (or use env default).
//   const { code, clientId, clientSecret, redirectUri } = req.query;
//   const cid = clientId || CLIENT_ID;
//   const csec = clientSecret || CLIENT_SECRET;
//   const ruri = redirectUri || REDIRECT_URI;
//   if (!code || !cid || !csec) return res.status(400).json({ error: "Missing required parameters" });

//   try {
//     const response = await axios.post(
//       "https://api.login.yahoo.com/oauth2/get_token",
//       new URLSearchParams({
//         grant_type: "authorization_code",
//         code,
//         redirect_uri: ruri,
//         client_id: cid,
//         client_secret: csec,
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     const { access_token, refresh_token } = response.data;
//     res.json({ message: "OAuth2 tokens received", refreshToken: refresh_token, accessToken: access_token });
//   } catch (err) {
//     console.error("❌ Error exchanging Yahoo code:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to exchange yahoo code" });
//   }
// });

// // ---------- Outlook auth URL + callback (existing pattern) ----------
// router.get("/outlook/auth-url", (req, res) => {
//   const { clientId, redirectUri } = req.query;
//   const cid = clientId || CLIENT_ID;
//   const ruri = redirectUri || REDIRECT_URI;
//   if (!cid) return res.status(400).json({ error: "Client ID required" });
//   const params = new URLSearchParams({
//     client_id: cid,
//     response_type: "code",
//     redirect_uri: ruri,
//     scope: OUTLOOK_SCOPES.join(" "),
//     response_mode: "query",
//   });
//   const url = `${OUTLOOK_AUTH_URL}?${params.toString()}`;
//   res.json({ url });
// });

// router.get("/outlook/callback", async (req, res) => {
//   const { code, clientId, clientSecret, redirectUri } = req.query;
//   const cid = clientId || CLIENT_ID;
//   const csec = clientSecret || CLIENT_SECRET;
//   const ruri = redirectUri || REDIRECT_URI;
//   if (!code || !cid || !csec) return res.status(400).json({ error: "Missing parameters" });

//   try {
//     const response = await axios.post(
//       OUTLOOK_TOKEN_URL,
//       new URLSearchParams({
//         grant_type: "authorization_code",
//         code,
//         redirect_uri: ruri,
//         client_id: cid,
//         client_secret: csec,
//         scope: OUTLOOK_SCOPES.join(" "),
//       }),
//       { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//     );
//     const { access_token, refresh_token } = response.data;
//     res.json({ message: "OAuth tokens received", refreshToken: refresh_token, accessToken: access_token });
//   } catch (err) {
//     console.error("❌ Error exchanging outlook code:", err.response?.data || err.message);
//     res.status(500).json({ error: "Failed to exchange outlook code" });
//   }
// });

// export default router;
