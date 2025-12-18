// server/src/services/oauth/oauthManager.js
// Centralized OAuth token management with automatic refresh

import { PrismaClient } from "@prisma/client"
import { EMAIL_PROVIDERS } from "../../config/emailProviders.js"

const prisma = new PrismaClient()

export class OAuthManager {
  constructor(accountId) {
    this.accountId = accountId
    this.account = null
  }

  async init() {
    this.account = await prisma.emailAccount.findUnique({
      where: { id: this.accountId },
    })
    return this
  }

  // Check if token needs refresh (5 min buffer)
  needsRefresh() {
    if (!this.account?.tokenExpiry) return true
    const expiryTime = new Date(this.account.tokenExpiry).getTime()
    const bufferTime = 5 * 60 * 1000 // 5 minutes
    return Date.now() > expiryTime - bufferTime
  }

  // Refresh OAuth token
  async refreshToken() {
    const provider = EMAIL_PROVIDERS[this.account.provider]
    if (!provider?.oauth) {
      throw new Error("Provider does not support OAuth")
    }

    const response = await fetch(provider.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env[`${this.account.provider.toUpperCase()}_CLIENT_ID`],
        client_secret: process.env[`${this.account.provider.toUpperCase()}_CLIENT_SECRET`],
        refresh_token: this.account.refreshToken,
        grant_type: "refresh_token",
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error("Token refresh failed:", data.error_description)
      throw new Error(data.error_description || "Token refresh failed")
    }

    // Update tokens in database
    const updatedAccount = await prisma.emailAccount.update({
      where: { id: this.accountId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.account.refreshToken,
        tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      },
    })

    this.account = updatedAccount
    return data.access_token
  }

  // Get valid access token (refresh if needed)
  async getAccessToken() {
    if (this.needsRefresh()) {
      return await this.refreshToken()
    }
    return this.account.accessToken
  }

  // Build IMAP auth config for OAuth2
  async getImapAuth() {
    const accessToken = await this.getAccessToken()
    return {
      user: this.account.email,
      accessToken,
    }
  }

  // Build SMTP auth config for OAuth2
  async getSmtpAuth() {
    const accessToken = await this.getAccessToken()
    return {
      type: "OAuth2",
      user: this.account.email,
      accessToken,
    }
  }
}

// Factory function for easy instantiation
export async function createOAuthManager(accountId) {
  const manager = new OAuthManager(accountId)
  await manager.init()
  return manager
}
