// client/src/components/inbox/AuthSettings.jsx
import React from "react";

export default function AuthSettings({
  form,
  setForm,
  handleGetZohoToken,
  handleGetGoogleToken,
  handleGetYahooToken,
  handleGetRediffToken,
}) {
  return (
    <div className="border-t border-gray-700 pt-4">
      <h4 className="font-semibold mb-3">Authentication Credentials</h4>

      {form.authType === "password" ? (
        <div>
          <label className="block mb-2">App Password</label>
          <input
            type="password"
            placeholder="Enter app-specific password"
            value={form.encryptedPass}
            onChange={(e) =>
              setForm({ ...form, encryptedPass: e.target.value })
            }
            className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
            required
          />
          <div className="mt-2 p-3 bg-blue-900 bg-opacity-30 border border-blue-700 rounded">
            <p className="text-sm text-blue-200">
              {form.provider === "zoho" && (
                <>
                  <strong>Zoho:</strong> Go to Settings → Security → App
                  Passwords to generate one.
                </>
              )}
              {form.provider === "gmail" && (
                <>
                  <strong>Gmail:</strong> Go to Google Account → Security →
                  2-Step Verification → App passwords.
                </>
              )}
              {form.provider === "outlook" && (
                <>
                  <strong>Outlook:</strong> Go to Account Settings → Security →
                  App passwords.
                </>
              )}
              {form.provider === "rediff" && (
                <>
                  <strong>Rediff Mail Pro:</strong> Go to Mail Settings →
                  Security → Generate App Password.
                </>
              )}
              {form.provider === "amazon" && (
                <>
                  <strong>Amazon WorkMail:</strong> Go to Amazon WorkMail
                  settings → IMAP/POP settings → Enable IMAP access. Generate an
                  app password in your AWS account under Security credentials.
                </>
              )}
              {!["zoho", "gmail", "outlook", "rediff", "amazon"].includes(
                form.provider
              ) && (
                <>
                  Generate an app-specific password from your email provider's
                  security settings.
                </>
              )}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Zoho OAuth */}
          {form.provider === "zoho" ? (
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">OAuth Client ID</label>
                <input
                  type="text"
                  placeholder="1000.XXXXXXXXXXXXX"
                  value={form.oauthClientId}
                  onChange={(e) =>
                    setForm({ ...form, oauthClientId: e.target.value })
                  }
                  className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm">
                  OAuth Client Secret
                </label>
                <input
                  type="text"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={form.oauthClientSecret}
                  onChange={(e) =>
                    setForm({ ...form, oauthClientSecret: e.target.value })
                  }
                  className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm">
                  OAuth Refresh Token
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Paste refresh token here after authorization"
                    value={form.refreshToken}
                    onChange={(e) =>
                      setForm({ ...form, refreshToken: e.target.value })
                    }
                    className="flex-1 p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                    onClick={handleGetZohoToken}
                  >
                    Get Token
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Click "Get Token" to authorize with Zoho. Copy the refresh
                  token from the page that opens.
                </p>
              </div>
            </div>
          ) : form.provider === "gsuite" || form.provider === "gmail" ? (
            /* Google OAuth */
            <div className="space-y-4">
              <input type="hidden" value={form.oauthClientId} />
              <input type="hidden" value={form.oauthClientSecret} />
              <div>
                <label className="block mb-2">OAuth Refresh Token</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Paste refresh token here after authorization"
                    value={form.refreshToken}
                    onChange={(e) =>
                      setForm({ ...form, refreshToken: e.target.value })
                    }
                    className="flex-1 p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors whitespace-nowrap"
                    onClick={handleGetGoogleToken}
                  >
                    Get Token
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Click "Get Token" to authorize with Google. Copy the refresh
                  token from the response.
                </p>
              </div>
            </div>
          ) : form.provider === "yahoo" ? (
            /* Yahoo OAuth */
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">OAuth Client ID</label>
                <input
                  type="text"
                  placeholder="Yahoo Client ID"
                  value={form.oauthClientId}
                  onChange={(e) =>
                    setForm({ ...form, oauthClientId: e.target.value })
                  }
                  className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm">
                  OAuth Client Secret
                </label>
                <input
                  type="text"
                  placeholder="Yahoo Client Secret"
                  value={form.oauthClientSecret}
                  onChange={(e) =>
                    setForm({ ...form, oauthClientSecret: e.target.value })
                  }
                  className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm">
                  OAuth Refresh Token
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Paste refresh token here after authorization"
                    value={form.refreshToken}
                    onChange={(e) =>
                      setForm({ ...form, refreshToken: e.target.value })
                    }
                    className="flex-1 p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors whitespace-nowrap"
                    onClick={handleGetYahooToken}
                  >
                    Get Token
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Click "Get Token" to authorize with Yahoo. Copy the refresh
                  token from the response.
                </p>
              </div>
            </div>
          ) : form.provider === "rediff" ? (
            /* Rediff OAuth */
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">OAuth Client ID</label>
                <input
                  type="text"
                  placeholder="Rediff Client ID"
                  value={form.oauthClientId}
                  onChange={(e) =>
                    setForm({ ...form, oauthClientId: e.target.value })
                  }
                  className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm">
                  OAuth Client Secret
                </label>
                <input
                  type="text"
                  placeholder="Rediff Client Secret"
                  value={form.oauthClientSecret}
                  onChange={(e) =>
                    setForm({ ...form, oauthClientSecret: e.target.value })
                  }
                  className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm">
                  OAuth Refresh Token
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Paste refresh token here after authorization"
                    value={form.refreshToken}
                    onChange={(e) =>
                      setForm({ ...form, refreshToken: e.target.value })
                    }
                    className="flex-1 p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button
                    type="button"
                    className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors whitespace-nowrap"
                    onClick={handleGetRediffToken}
                  >
                    Get Token
                  </button>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Click "Get Token" to authorize with Rediff. Copy the refresh
                  token from the response.
                </p>
              </div>
            </div>
          ) : (
            /* Other OAuth providers */
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">OAuth Client ID</label>
                <input
                  type="text"
                  placeholder="OAuth Client ID"
                  value={form.oauthClientId}
                  onChange={(e) =>
                    setForm({ ...form, oauthClientId: e.target.value })
                  }
                  className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm">
                  OAuth Client Secret
                </label>
                <input
                  type="text"
                  placeholder="OAuth Client Secret"
                  value={form.oauthClientSecret}
                  onChange={(e) =>
                    setForm({ ...form, oauthClientSecret: e.target.value })
                  }
                  className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              {form.provider !== "outlook" && (
                <div>
                  <label className="block mb-2 text-sm">
                    OAuth Refresh Token
                  </label>
                  <input
                    type="text"
                    placeholder="OAuth Refresh Token"
                    value={form.refreshToken}
                    onChange={(e) =>
                      setForm({ ...form, refreshToken: e.target.value })
                    }
                    className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
