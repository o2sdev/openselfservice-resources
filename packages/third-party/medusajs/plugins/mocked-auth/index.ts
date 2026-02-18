import type { MiddlewareRoute } from "@medusajs/framework/http"
import type {
  ThirdPartyAuthPluginOptions,
  ResolvedPluginOptions,
} from "./types"
import { createThirdPartyAuthMiddleware } from "./middleware/auth-middleware"

// -----------------------------------------------------------------------
// Re-export types so consumers can import them from the package root
// -----------------------------------------------------------------------
export type {
  ThirdPartyAuthPluginOptions,
  ResolvedPluginOptions,
  ThirdPartyJWTPayload,
  JWTCustomer,
  PermissionResource,
} from "./types"
export { JwtService } from "./services/jwt-service"
export { UserService } from "./services/user-service"
export { createThirdPartyAuthMiddleware } from "./middleware/auth-middleware"

// Re-export the auth provider for direct imports
export { ThirdPartyJwtAuthProvider } from "./providers/service"

// -----------------------------------------------------------------------
// Default configuration values
// -----------------------------------------------------------------------
const DEFAULTS: Omit<ResolvedPluginOptions, "jwtSecret"> = {
  headerName: "authorization",
  tokenPrefix: "Bearer",
  autoCreateCustomer: true,
  routeMatchers: ["/store/*"],
  allowUnauthenticated: true,
}

/**
 * Resolve user-provided options by merging with sensible defaults.
 */
export function resolveOptions(
  userOptions: ThirdPartyAuthPluginOptions
): ResolvedPluginOptions {
  const secret =
    userOptions.jwtSecret || process.env.THIRD_PARTY_AUTH_JWT_SECRET

  if (!secret) {
    throw new Error(
      "[third-party-auth] A JWT secret is required. " +
        "Provide it via the `jwtSecret` option or the " +
        "THIRD_PARTY_AUTH_JWT_SECRET environment variable."
    )
  }

  return {
    jwtSecret: secret,
    headerName: userOptions.headerName ?? DEFAULTS.headerName,
    tokenPrefix: userOptions.tokenPrefix ?? DEFAULTS.tokenPrefix,
    autoCreateCustomer:
      userOptions.autoCreateCustomer ?? DEFAULTS.autoCreateCustomer,
    routeMatchers: userOptions.routeMatchers ?? DEFAULTS.routeMatchers,
    allowUnauthenticated:
      userOptions.allowUnauthenticated ?? DEFAULTS.allowUnauthenticated,
  }
}

/**
 * Generate Medusa `MiddlewareRoute[]` entries for every configured
 * route matcher.  Import and spread these into your project's
 * `api/middlewares.ts`.
 *
 * @example
 * ```ts
 * // src/api/middlewares.ts
 * import { defineMiddlewares } from "@medusajs/framework/http"
 * import { getThirdPartyAuthMiddlewares } from "../plugins/third-party-auth"
 *
 * export default defineMiddlewares({
 *   routes: [
 *     ...getThirdPartyAuthMiddlewares({
 *       jwtSecret: process.env.THIRD_PARTY_AUTH_JWT_SECRET!,
 *     }),
 *   ],
 * })
 * ```
 */
export function getThirdPartyAuthMiddlewares(
  userOptions: ThirdPartyAuthPluginOptions
): MiddlewareRoute[] {
  const options = resolveOptions(userOptions)
  const middleware = createThirdPartyAuthMiddleware(options)

  return options.routeMatchers.map((matcher) => ({
    matcher,
    middlewares: [middleware],
  }))
}
