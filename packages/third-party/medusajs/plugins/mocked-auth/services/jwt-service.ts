import jwt from "jsonwebtoken"
import type { ThirdPartyJWTPayload, ResolvedPluginOptions } from "../types"
import { throwInvalidToken, throwExpiredToken } from "../utils/errors"

/**
 * Service responsible for validating and parsing third-party JWT tokens.
 *
 * Uses HS256 symmetric signing with a shared secret.
 */
export class JwtService {
  private readonly secret: string

  constructor(options: ResolvedPluginOptions) {
    this.secret = options.jwtSecret
  }

  /**
   * Extract a raw token string from the Authorization header value.
   *
   * Strips the configured prefix (e.g. "Bearer ") and returns
   * the remaining token string, or `null` if the header is absent /
   * does not match the expected prefix.
   */
  extractToken(
    headerValue: string | undefined,
    prefix: string
  ): string | null {
    if (!headerValue) {
      return null
    }

    const normalizedPrefix = prefix.toLowerCase()
    const normalizedHeader = headerValue.toLowerCase()

    if (!normalizedHeader.startsWith(normalizedPrefix + " ")) {
      return null
    }

    // Preserve original casing of the token itself
    return headerValue.slice(prefix.length + 1).trim()
  }

  /**
   * Verify and decode a JWT token.
   *
   * @returns The decoded payload if the token is valid.
   * @throws MedusaError with UNAUTHORIZED type if the token is invalid or expired.
   */
  verify(token: string): ThirdPartyJWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ["HS256"],
      })

      return decoded as ThirdPartyJWTPayload
    } catch (error) {
      if (error && typeof error === "object" && "name" in error) {
        const err = error as { name: string; message: string }
        if (err.name === "TokenExpiredError") {
          throwExpiredToken()
        }
        if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
          throwInvalidToken(err.message)
        }
      }

      throwInvalidToken("Unexpected verification error")
    }
  }

  /**
   * Decode a token without verification (for debugging/logging only).
   * Never use this for authentication decisions.
   */
  decode(token: string): ThirdPartyJWTPayload | null {
    const decoded = jwt.decode(token)
    if (!decoded || typeof decoded === "string") {
      return null
    }
    return decoded as ThirdPartyJWTPayload
  }
}
