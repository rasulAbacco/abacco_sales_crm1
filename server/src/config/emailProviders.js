// server/src/config/emailProviders.js
// Complete OAuth2 and IMAP configuration for all major providers

export const EMAIL_PROVIDERS = {
  gmail: {
    name: "Gmail / G-Suite",
    authType: "oauth2",
    oauth: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "https://mail.google.com/",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.labels",
      ],
      // Gmail supports Push Notifications via Pub/Sub
      pushSupported: true,
      historyIdSupported: true,
    },
    imap: {
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      authMethod: "XOAUTH2",
    },
    smtp: {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
    },
    features: {
      labels: true,
      categories: true, // Social, Updates, Promotions
      smartLabels: true,
      threading: true,
      archiveFolder: "[Gmail]/All Mail",
      trashFolder: "[Gmail]/Trash",
      sentFolder: "[Gmail]/Sent Mail",
      spamFolder: "[Gmail]/Spam",
      draftsFolder: "[Gmail]/Drafts",
    },
  },

  outlook: {
    name: "Outlook / Microsoft 365",
    authType: "oauth2",
    oauth: {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      scopes: [
        "https://graph.microsoft.com/Mail.ReadWrite",
        "https://graph.microsoft.com/Mail.Send",
        "https://graph.microsoft.com/User.Read",
        "offline_access",
      ],
      // Outlook supports Change Notifications via webhooks
      pushSupported: true,
      deltaSupported: true, // Delta sync API
    },
    graph: {
      baseUrl: "https://graph.microsoft.com/v1.0",
      mailEndpoint: "/me/messages",
      foldersEndpoint: "/me/mailFolders",
    },
    imap: {
      host: "outlook.office365.com",
      port: 993,
      secure: true,
      authMethod: "XOAUTH2",
    },
    smtp: {
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      requireTLS: true,
    },
    features: {
      categories: true,
      flags: true, // Follow-up flags
      importance: true,
      focusedInbox: true,
      threading: true,
      archiveFolder: "Archive",
      trashFolder: "Deleted Items",
      sentFolder: "Sent Items",
      spamFolder: "Junk Email",
      draftsFolder: "Drafts",
    },
  },

  zoho: {
    name: "Zoho Mail",
    authType: "oauth2",
    oauth: {
      authUrl: "https://accounts.zoho.com/oauth/v2/auth",
      tokenUrl: "https://accounts.zoho.com/oauth/v2/token",
      scopes: ["ZohoMail.messages.ALL", "ZohoMail.folders.ALL", "ZohoMail.accounts.READ"],
      pushSupported: false,
    },
    imap: {
      host: "imap.zoho.com",
      port: 993,
      secure: true,
    },
    smtp: {
      host: "smtp.zoho.com",
      port: 587,
      secure: false,
      requireTLS: true,
    },
    features: {
      threading: true,
      archiveFolder: "Archive",
      trashFolder: "Trash",
      sentFolder: "Sent",
      spamFolder: "Spam",
      draftsFolder: "Drafts",
    },
  },

  bluehost: {
    name: "Bluehost / cPanel",
    authType: "password",
    imap: {
      host: "mail.{domain}", // Dynamic based on user domain
      port: 993,
      secure: true,
    },
    smtp: {
      host: "mail.{domain}",
      port: 465,
      secure: true,
    },
    features: {
      threading: false, // Must implement client-side
      customFolders: true,
    },
  },

  generic: {
    name: "Generic IMAP/SMTP",
    authType: "password",
    features: {
      threading: false,
      customFolders: true,
    },
  },
}

// Detect provider from email domain
export function detectProvider(email) {
  const domain = email.split("@")[1]?.toLowerCase()

  if (domain?.includes("gmail") || domain?.includes("googlemail")) {
    return "gmail"
  }
  if (
    domain?.includes("outlook") ||
    domain?.includes("hotmail") ||
    domain?.includes("live") ||
    domain?.includes("msn")
  ) {
    return "outlook"
  }
  if (domain?.includes("zoho")) {
    return "zoho"
  }
  // Add more domain detection as needed
  return "generic"
}

// Build OAuth URL for provider
export function buildOAuthUrl(provider, clientId, redirectUri, state) {
  const config = EMAIL_PROVIDERS[provider]
  if (!config?.oauth) return null

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.oauth.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  })

  return `${config.oauth.authUrl}?${params.toString()}`
}
