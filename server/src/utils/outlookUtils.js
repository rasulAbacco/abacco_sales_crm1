// utils/outlookUtils.js
import axios from "axios";
const BASE_URL = process.env.API_BASE_URL || "http://localhost:4002";

export async function getOutlookAccessToken(account, prisma) {
  try {
    const res = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: account.oauthClientId,
        client_secret: account.oauthClientSecret,
        refresh_token: account.refreshToken,
        grant_type: "refresh_token",
        redirect_uri: `${BASE_URL}/oauth/outlook/callback`,
      })
    );

    const { access_token, refresh_token, expires_in } = res.data;

    // update DB
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiry: new Date(Date.now() + expires_in * 1000),
      },
    });

    return access_token;
  } catch (err) {
    console.error("❌ Failed to refresh Outlook token:", err.response?.data || err.message);
    throw err;
  }
}
