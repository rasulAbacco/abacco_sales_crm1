import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function OAuthOutlookCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // ✅ Prevent duplicate executions in Strict Mode
    if (window.__outlookCallbackHandled) return;
    window.__outlookCallbackHandled = true;

    const handleCallback = async () => {
      const query = new URLSearchParams(location.search);
      const code = query.get("code");
      const clientId = localStorage.getItem("outlookClientId");
      const clientSecret = localStorage.getItem("outlookClientSecret");
      const email = localStorage.getItem("outlookEmail") || "";

      if (!code || !clientId || !clientSecret) {
        alert(
          "Missing required parameters from Outlook OAuth. Ensure client ID/secret and redirect URI match."
        );
        navigate("/");
        return;
      }

      try {
        // Step 1: Exchange code for tokens
        const res = await api.get(`${API_BASE_URL}/auth/outlook/callback`, {
          params: {
            code,
            clientId,
            clientSecret,
            redirectUri: `${window.location.origin}${API_BASE_URL}/oauth/outlook/callback`,
          },
        });

        const { refreshToken, accessToken } = res.data;

        // Step 2: Save account in backend
        await api.post("/accounts", {
          email,
          provider: "outlook",
          imapHost: "outlook.office365.com",
          imapPort: 993,
          imapUser: email,
          smtpHost: "smtp.office365.com",
          smtpPort: 587,
          smtpUser: email,
          encryptedPass: "",
          oauthClientId: clientId,
          oauthClientSecret: clientSecret,
          refreshToken,
          authType: "oauth",
        });

        alert("✅ Outlook account added successfully!");
        navigate("/");
      } catch (err) {
        console.error(
          "OAuth callback failed:",
          err.response?.data || err.message || err
        );
        alert(
          "❌ Failed to complete Outlook OAuth: " +
            (err.response?.data?.error_description || err.message)
        );
        navigate("/");
      }
    };

    handleCallback();
  }, [location.search, navigate]);

  return <div className="p-10 text-white">Finishing Outlook login...</div>;
}
