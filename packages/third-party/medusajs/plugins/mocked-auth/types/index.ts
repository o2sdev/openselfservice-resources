/**
 * Represents a single permission resource with its allowed actions.
 */
export interface PermissionResource {
  resource: string
  actions: string[]
}

/**
 * Represents the customer/organization data embedded in the JWT token.
 */
export interface JWTCustomer {
  id: string
  name: string
  permissions: Record<string, PermissionResource>
  roles: string[]
}

/**
 * The full JWT payload structure expected from the third-party auth provider.
 */
export interface ThirdPartyJWTPayload {
  /** User's display name */
  name: string
  /** User's email address */
  email: string
  /** User-level permissions keyed by resource name */
  permissions: Record<string, PermissionResource>
  /** User-level roles */
  roles: string[]
  /** Optional customer/organization context */
  customer?: JWTCustomer
  /** Token issued-at timestamp (epoch seconds) */
  iat: number
}

/**
 * Configuration options for the third-party auth plugin.
 */
export interface ThirdPartyAuthPluginOptions {
  /**
   * Shared secret for HS256 JWT validation.
   * Can also be provided via `THIRD_PARTY_AUTH_JWT_SECRET` env var.
   */
  jwtSecret: string

  /**
   * HTTP header name to read the token from.
   * @default "authorization"
   */
  headerName?: string

  /**
   * Token prefix to strip from the header value.
   * @default "Bearer"
   */
  tokenPrefix?: string

  /**
   * Whether to automatically create a Medusa customer if one
   * doesn't exist for the email in the JWT.
   * @default true
   */
  autoCreateCustomer?: boolean

  /**
   * Route patterns to protect with this middleware.
   * Uses Express-style matchers.
   * @default ["/store/*"]
   */
  routeMatchers?: string[]

  /**
   * Whether to allow requests without a token to proceed.
   * When true, the middleware only authenticates if a token is present.
   * When false, requests without a token will be rejected.
   * @default true
   */
  allowUnauthenticated?: boolean
}

/**
 * Resolved configuration with all defaults applied.
 */
export interface ResolvedPluginOptions extends Required<ThirdPartyAuthPluginOptions> {}
