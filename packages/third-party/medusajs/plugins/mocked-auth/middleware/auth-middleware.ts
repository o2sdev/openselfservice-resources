import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  generateJwtToken,
} from "@medusajs/framework/utils"
import type { ResolvedPluginOptions } from "../types"
import { JwtService } from "../services/jwt-service"
import { UserService } from "../services/user-service"
import { throwMissingToken } from "../utils/errors"

/**
 * Auth provider identifier — must match the provider registered in medusa-config.ts.
 */
const AUTH_PROVIDER = "third-party-jwt"

/**
 * Creates a middleware function that:
 * 1. Extracts the third-party JWT from the request header
 * 2. Validates the token using the configured secret
 * 3. Resolves (or creates) a Medusa customer from the JWT claims
 * 4. **Re-signs a Medusa-compatible JWT** using Medusa's own jwtSecret
 * 5. Replaces the Authorization header so Medusa's built-in `authenticate()`
 *    middleware processes a valid Medusa JWT
 *
 * This approach eliminates conflicts with Medusa's authentication system
 * because the downstream `authenticate("customer", ["bearer"])` middleware
 * receives a JWT signed with Medusa's secret containing the correct
 * `actor_id`, `actor_type`, and `auth_identity_id`.
 *
 * @param options - Resolved plugin configuration.
 * @returns An Express-compatible middleware function.
 */
export function createThirdPartyAuthMiddleware(options: ResolvedPluginOptions) {
  const jwtService = new JwtService(options)
  const userService = new UserService(options)

  return async function thirdPartyAuthMiddleware(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ): Promise<void> {
    const headerKey = options.headerName.toLowerCase()
    const headerValue = req.headers[headerKey] as string | undefined

    // Try to extract a third-party JWT from the header
    const token = jwtService.extractToken(headerValue, options.tokenPrefix)

    // If no token is present, either allow or reject
    if (!token) {
      if (options.allowUnauthenticated) {
        return next()
      }
      throwMissingToken()
    }

    // Quick check: is this already a Medusa JWT? If so, skip re-signing.
    // Medusa JWTs contain `actor_type` in their payload; third-party JWTs don't.
    const decoded = jwtService.decode(token)
    if (decoded && "actor_type" in decoded) {
      // This is already a Medusa JWT — let it pass through
      return next()
    }

    // Validate the third-party JWT
    const payload = jwtService.verify(token)

    // Resolve (find or create) the Medusa customer
    const customer = await userService.resolveCustomer(payload, req.scope)

    // Attempt to link the customer to an auth identity (best-effort)
    userService
      .linkCustomerToAuthIdentity(
        customer.id,
        payload.email,
        AUTH_PROVIDER,
        req.scope
      )
      .catch(() => {
        // Silently ignore linking failures — the re-signed JWT works regardless
      })

    // Get Medusa's JWT configuration
    const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    const { http } = config.projectConfig

    // Generate a Medusa-compatible JWT signed with Medusa's secret.
    // This JWT has the same shape that Medusa's `authenticate()` middleware expects.
    const medusaToken = generateJwtToken(
      {
        actor_id: customer.id,
        actor_type: "customer",
        auth_identity_id: `${AUTH_PROVIDER}:${payload.email}`,
        app_metadata: {
          customer_id: customer.id,
          third_party_auth: true,
          roles: payload.roles,
          permissions: payload.permissions,
          external_customer_id: payload.customer?.id ?? null,
          external_customer_name: payload.customer?.name ?? null,
          customer_roles: payload.customer?.roles ?? null,
          customer_permissions: payload.customer?.permissions ?? null,
        },
        user_metadata: {
          name: payload.name,
          email: payload.email,
        },
      },
      {
        secret: http.jwtSecret,
        expiresIn: http.jwtExpiresIn ?? "24h",
      }
    )

    // Replace the Authorization header with the Medusa-signed JWT.
    // Medusa's built-in `authenticate("customer", ["bearer"])` middleware
    // will now see a valid token and correctly set `req.auth_context`.
    req.headers[headerKey] = `Bearer ${medusaToken}`

    // Set auth_context directly so routes that read req.auth_context?.actor_id
    // but don't have authenticate() middleware (e.g. POST /store/carts) still
    // get the customer ID. Routes that DO have authenticate() will overwrite
    // this with identical values from the re-signed JWT above.
    ;(req as any).auth_context = {
      actor_id: customer.id,
      actor_type: "customer",
      auth_identity_id: `${AUTH_PROVIDER}:${payload.email}`,
      app_metadata: {
        customer_id: customer.id,
        third_party_auth: true,
        roles: payload.roles,
        permissions: payload.permissions,
        external_customer_id: payload.customer?.id ?? null,
        external_customer_name: payload.customer?.name ?? null,
        customer_roles: payload.customer?.roles ?? null,
        customer_permissions: payload.customer?.permissions ?? null,
      },
      user_metadata: {
        name: payload.name,
        email: payload.email,
      },
    }

    next()
  }
}
