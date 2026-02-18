import { AbstractAuthModuleProvider, MedusaError } from "@medusajs/framework/utils"
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from "@medusajs/framework/types"
import jwt from "jsonwebtoken"
import type { ThirdPartyJWTPayload } from "../types"

/**
 * Options passed to the provider via medusa-config.ts.
 */
type ThirdPartyJwtProviderOptions = {
  /** Shared secret for HS256 JWT validation. */
  jwtSecret: string
  /**
   * Token prefix to strip from the Authorization header value.
   * @default "Bearer"
   */
  tokenPrefix?: string
}

/**
 * Auth Module Provider that validates third-party JWT tokens
 * and integrates with Medusa's authentication system.
 *
 * This enables the standard Medusa auth flow:
 *   POST /auth/customer/third-party-jwt  →  { token: <medusa-jwt> }
 *
 * The third-party JWT can be passed either:
 * - In the request body as `{ token: "..." }`
 * - In the Authorization header as `Bearer <token>`
 */
export class ThirdPartyJwtAuthProvider extends AbstractAuthModuleProvider {
  static identifier = "third-party-jwt"
  static DISPLAY_NAME = "Third-Party JWT"

  private jwtSecret: string
  private tokenPrefix: string
  private logger: Logger

  static validateOptions(options: Record<string, unknown>): void | never {
    if (!options.jwtSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The `jwtSecret` option is required for the third-party-jwt auth provider."
      )
    }
  }

  constructor(
    container: { logger: Logger },
    options: ThirdPartyJwtProviderOptions
  ) {
    // @ts-expect-error: AbstractAuthModuleProvider expects ...arguments spread
    super(...arguments)

    this.jwtSecret = options.jwtSecret
    this.tokenPrefix = options.tokenPrefix ?? "Bearer"
    this.logger = container.logger
  }

  /**
   * Authenticate a user by validating the third-party JWT.
   *
   * Accepts the token via:
   *   - body.token: `POST /auth/customer/third-party-jwt` with `{ "token": "..." }`
   *   - headers.authorization: `Bearer <token>`
   */
  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    // 1. Extract the third-party JWT
    const token = this.extractToken(data)

    if (!token) {
      return {
        success: false,
        error:
          "Missing third-party JWT. Provide it in the request body as `token` " +
          "or in the Authorization header.",
      }
    }

    // 2. Validate the JWT
    let payload: ThirdPartyJWTPayload
    try {
      payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ["HS256"],
      }) as ThirdPartyJWTPayload
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string }
      if (err.name === "TokenExpiredError") {
        return { success: false, error: "Third-party JWT has expired." }
      }
      return {
        success: false,
        error: `Invalid third-party JWT: ${err.message ?? "verification failed"}`,
      }
    }

    if (!payload.email) {
      return {
        success: false,
        error: "Third-party JWT must contain an `email` claim.",
      }
    }

    // 3. Retrieve or create the auth identity
    const entityId = payload.email

    let authIdentity
    try {
      authIdentity = await authIdentityProviderService.retrieve({
        entity_id: entityId,
      })

      // Update metadata on existing identity
      authIdentity = await authIdentityProviderService.update(entityId, {
        user_metadata: {
          name: payload.name,
          email: payload.email,
          roles: payload.roles,
          permissions: payload.permissions,
          external_customer: payload.customer ?? null,
        },
      })
    } catch (error: unknown) {
      const err = error as { type?: string }
      if (err.type === MedusaError.Types.NOT_FOUND) {
        // Create a new auth identity
        authIdentity = await authIdentityProviderService.create({
          entity_id: entityId,
          user_metadata: {
            name: payload.name,
            email: payload.email,
            roles: payload.roles,
            permissions: payload.permissions,
            external_customer: payload.customer ?? null,
          },
        })

        this.logger.info(
          `[third-party-jwt] Created auth identity for ${entityId}`
        )
      } else {
        return {
          success: false,
          error: `Failed to retrieve auth identity: ${(error as Error).message}`,
        }
      }
    }

    return {
      success: true,
      authIdentity,
    }
  }

  /**
   * Extract the raw JWT string from request data.
   * Checks body.token first, then Authorization header.
   */
  private extractToken(data: AuthenticationInput): string | null {
    // Check body.token (standard for POST /auth/customer/third-party-jwt)
    if (data.body?.token && typeof data.body.token === "string") {
      return data.body.token
    }

    // Check Authorization header
    const authHeader = data.headers?.authorization
    if (!authHeader) {
      return null
    }

    const prefix = this.tokenPrefix.toLowerCase()
    const headerLower = authHeader.toLowerCase()
    if (!headerLower.startsWith(prefix + " ")) {
      return null
    }

    return authHeader.slice(this.tokenPrefix.length + 1).trim()
  }
}
