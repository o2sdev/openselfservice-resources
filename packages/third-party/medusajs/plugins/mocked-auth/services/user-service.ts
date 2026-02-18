import type { MedusaContainer } from "@medusajs/framework"
import type { ICustomerModuleService, CustomerDTO } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createCustomersWorkflow } from "@medusajs/medusa/core-flows"
import type { ThirdPartyJWTPayload, ResolvedPluginOptions } from "../types"
import { throwCustomerResolutionError } from "../utils/errors"

/**
 * Service responsible for resolving (finding or creating) Medusa customers
 * based on claims from a third-party JWT token.
 *
 * Also handles linking customers to auth identities so that
 * Medusa's standard authentication flow works correctly.
 */
export class UserService {
  private readonly options: ResolvedPluginOptions

  constructor(options: ResolvedPluginOptions) {
    this.options = options
  }

  /**
   * Find an existing Medusa customer by email, or create one if
   * `autoCreateCustomer` is enabled.
   *
   * @param payload - The decoded JWT payload containing user information.
   * @param container - The Medusa DI container for resolving services.
   * @returns The resolved Medusa customer.
   */
  async resolveCustomer(
    payload: ThirdPartyJWTPayload,
    container: MedusaContainer
  ): Promise<CustomerDTO> {
    const customerModule: ICustomerModuleService =
      container.resolve(Modules.CUSTOMER)

    // Try to find an existing customer by email
    const [existingCustomers] = await customerModule.listAndCountCustomers({
      email: payload.email,
    })

    if (existingCustomers.length > 0) {
      return existingCustomers[0]
    }

    // Auto-create if configured
    if (!this.options.autoCreateCustomer) {
      throwCustomerResolutionError(
        `No customer found with email "${payload.email}" and auto-creation is disabled.`
      )
    }

    return this.createCustomer(payload, container)
  }

  /**
   * Ensure the auth identity is linked to the customer in Medusa's auth system.
   *
   * This sets `app_metadata.customer_id` on the auth identity so that
   * Medusa's JWT generation includes the correct `actor_id`.
   *
   * @param customerId - The Medusa customer ID.
   * @param entityId - The entity_id used in the auth identity (typically email).
   * @param authProvider - The auth provider identifier.
   * @param container - The Medusa DI container.
   */
  async linkCustomerToAuthIdentity(
    customerId: string,
    entityId: string,
    authProvider: string,
    container: MedusaContainer
  ): Promise<void> {
    try {
      const authModule = container.resolve(Modules.AUTH)

      // List auth identities that match our provider and entity_id
      const [authIdentities] = await authModule.listAndCountAuthIdentities({
        provider_identities: {
          entity_id: entityId,
          provider: authProvider,
        },
      })

      if (authIdentities.length > 0) {
        const authIdentity = authIdentities[0]

        // Check if already linked
        if (authIdentity.app_metadata?.customer_id === customerId) {
          return // Already linked
        }

        // Update app_metadata to link customer
        await authModule.updateAuthIdentities({
          id: authIdentity.id,
          app_metadata: {
            ...authIdentity.app_metadata,
            customer_id: customerId,
          },
        })
      }
    } catch {
      // Linking is best-effort; don't fail the request if it doesn't work
      // The middleware approach with JWT re-signing handles auth regardless
    }
  }

  /**
   * Create a new Medusa customer from JWT claims using the
   * `createCustomersWorkflow`.
   */
  private async createCustomer(
    payload: ThirdPartyJWTPayload,
    container: MedusaContainer
  ): Promise<CustomerDTO> {
    const nameParts = this.splitName(payload.name)

    try {
      const { result } = await createCustomersWorkflow(container).run({
        input: {
          customersData: [
            {
              email: payload.email,
              first_name: nameParts.firstName,
              last_name: nameParts.lastName,
              company_name: payload.customer?.name ?? null,
              has_account: true,
              metadata: this.buildMetadata(payload),
            },
          ],
        },
      })

      return result[0]
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error"
      throwCustomerResolutionError(
        `Failed to create customer for "${payload.email}": ${message}`
      )
    }
  }

  /**
   * Build metadata object from JWT claims to store on the customer record.
   */
  private buildMetadata(
    payload: ThirdPartyJWTPayload
  ): Record<string, unknown> {
    return {
      third_party_auth: {
        roles: payload.roles,
        permissions: payload.permissions,
        external_customer_id: payload.customer?.id ?? null,
        external_customer_name: payload.customer?.name ?? null,
        customer_roles: payload.customer?.roles ?? null,
        customer_permissions: payload.customer?.permissions ?? null,
      },
    }
  }

  /**
   * Split a full name string into first name and last name.
   */
  private splitName(fullName: string): {
    firstName: string
    lastName: string | null
  } {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 0) {
      return { firstName: "", lastName: null }
    }
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: null }
    }
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    }
  }
}
