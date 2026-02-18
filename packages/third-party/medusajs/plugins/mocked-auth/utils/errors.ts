import { MedusaError } from "@medusajs/framework/utils"

/**
 * Throw when no JWT token is found in the request headers.
 */
export function throwMissingToken(): never {
  throw new MedusaError(
    MedusaError.Types.UNAUTHORIZED,
    "Missing authentication token. Provide a valid JWT in the Authorization header."
  )
}

/**
 * Throw when the JWT token is malformed or cannot be decoded.
 */
export function throwInvalidToken(detail?: string): never {
  const message = detail
    ? `Invalid authentication token: ${detail}`
    : "Invalid authentication token."
  throw new MedusaError(MedusaError.Types.UNAUTHORIZED, message)
}

/**
 * Throw when the JWT token has expired.
 */
export function throwExpiredToken(): never {
  throw new MedusaError(
    MedusaError.Types.UNAUTHORIZED,
    "Authentication token has expired."
  )
}

/**
 * Throw when customer creation or lookup fails.
 */
export function throwCustomerResolutionError(detail: string): never {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Failed to resolve customer: ${detail}`
  )
}
