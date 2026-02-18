# @your-org/medusa-plugin-third-party-auth

A Medusa plugin that authenticates customers using **third-party JWT tokens**.
It validates incoming JWTs (HS256), resolves or auto-creates Medusa customers,
and integrates with Medusa's **Auth Module** for proper authentication.

---

## Features

- **HS256 JWT validation** with a shared secret
- **Auth Module Provider** — standard Medusa authentication via `/auth/customer/third-party-jwt`
- **Transparent middleware** — re-signs third-party JWTs as Medusa JWTs so all
  store routes (including `/store/customers/me/*`) work seamlessly
- **Auto-create customers** from JWT claims (email + name)
- Stores third-party **permissions, roles, and organisation data** in customer
  metadata and auth identity metadata
- Fully typed — exports all TypeScript interfaces
- Structured for **easy extraction** into a standalone NPM package

---

## JWT Token Structure

The plugin expects a JWT payload with the following shape:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "permissions": {
    "orders": {
      "resource": "orders",
      "actions": ["view", "create", "edit", "cancel", "track"]
    }
  },
  "roles": ["selfservice_org_user", "selfservice_org_admin"],
  "customer": {
    "id": "cus_01KGSR4NSX1S7Y48E6MVWPPVDP",
    "name": "Acme Corporation",
    "permissions": { "...same structure..." },
    "roles": ["selfservice_org_user"]
  },
  "iat": 1770635335
}
```

---

## Installation

### Within a Medusa project (in-repo)

The plugin lives under `src/plugins/third-party-auth/` and is used directly.
No additional installation is needed.

### As an NPM package (extracted)

```bash
npm install @your-org/medusa-plugin-third-party-auth
```

---

## Configuration

### Environment variable

Add the shared secret to your `.env`:

```env
THIRD_PARTY_AUTH_JWT_SECRET=your-shared-secret-here
```

### 1. Register the Auth Module Provider

In `medusa-config.ts`:

```typescript
import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    // ...
  },
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "./src/plugins/third-party-auth/providers",
            // or: "@your-org/medusa-plugin-third-party-auth/providers"
            id: "third-party-jwt",
            options: {
              jwtSecret: process.env.THIRD_PARTY_AUTH_JWT_SECRET,
            },
          },
        ],
      },
    },
  ],
})
```

### 2. Register the middleware

In `src/api/middlewares.ts`:

```typescript
import { defineMiddlewares } from "@medusajs/framework/http"
import { createThirdPartyAuthMiddleware, resolveOptions } from "../plugins/third-party-auth"

const thirdPartyAuthOptions = resolveOptions({
  jwtSecret: process.env.THIRD_PARTY_AUTH_JWT_SECRET!,
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/*",
      middlewares: [
        createThirdPartyAuthMiddleware({
          ...thirdPartyAuthOptions,
          allowUnauthenticated: true,
        }),
      ],
    },
  ],
})
```

### Options

| Option                 | Type       | Default            | Description                                         |
|------------------------|------------|--------------------|-----------------------------------------------------|
| `jwtSecret`            | `string`   | _(required)_       | Shared secret for HS256 validation                  |
| `headerName`           | `string`   | `"authorization"`  | HTTP header name to read the token from             |
| `tokenPrefix`          | `string`   | `"Bearer"`         | Prefix to strip from the header value               |
| `autoCreateCustomer`   | `boolean`  | `true`             | Auto-create Medusa customer if not found            |
| `routeMatchers`        | `string[]` | `["/store/*"]`     | Route patterns protected by this middleware         |
| `allowUnauthenticated` | `boolean`  | `true`             | Allow requests without a token to proceed           |

---

## How It Works

The plugin provides **two authentication paths**:

### Path A: Direct JWT usage (middleware)

Send the third-party JWT directly on any store API call. The middleware
transparently handles everything:

```
Client → POST /store/customers/me/addresses
         Authorization: Bearer <third-party-jwt>
         ↓
Middleware:
  1. Validates third-party JWT (HS256)
  2. Resolves/creates Medusa customer
  3. Re-signs as Medusa JWT (with Medusa's jwtSecret)
  4. Replaces Authorization header
         ↓
Medusa's authenticate() middleware:
  Sees valid Medusa JWT → sets req.auth_context
         ↓
Route handler: processes request as authenticated customer
```

This is the **recommended approach** for most use cases — no token exchange needed.

### Path B: Token exchange (Auth Module)

Use Medusa's standard authentication flow for a formal token exchange:

```
1. POST /auth/customer/third-party-jwt
   Body: { "token": "<third-party-jwt>" }
   → Response: { "token": "<medusa-jwt>" }

2. POST /store/customers/me/addresses
   Authorization: Bearer <medusa-jwt>
   → Works with standard Medusa auth
```

This is useful when you want to:
- Obtain a Medusa JWT for session management
- Use Medusa's session-based auth after initial authentication
- Follow Medusa's standard OAuth-like auth flow

---

## Creating Protected API Routes

Routes matching the configured patterns can access the authenticated customer.
Use `AuthenticatedMedusaRequest` for type safety:

```typescript
// src/api/store/custom/route.ts
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const metadata = req.auth_context.app_metadata

  res.json({
    customer_id: customerId,
    roles: metadata.roles,
    permissions: metadata.permissions,
    external_customer_id: metadata.external_customer_id,
  })
}
```

### Accessing auth context on public routes

When `allowUnauthenticated: true` (default), `req.auth_context` may be undefined:

```typescript
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id

  if (customerId) {
    // Authenticated — return personalized results
  } else {
    // Public access — return general results
  }
}
```

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │         medusa-config.ts                 │
                    │                                         │
                    │  Auth Module Provider:                   │
                    │    resolve: ./providers                  │
                    │    id: "third-party-jwt"                 │
                    │                                         │
                    │  → Enables POST /auth/customer/          │
                    │    third-party-jwt (token exchange)      │
                    └─────────────────────────────────────────┘

  Request with Authorization: Bearer <third-party-jwt>
    │
    ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Third-Party Auth Middleware (src/api/middlewares.ts)    │
  │                                                         │
  │  1. Extract token from Authorization header             │
  │  2. Check: is this already a Medusa JWT? → skip         │
  │  3. Verify third-party JWT (HS256)                      │
  │  4. Resolve or create Medusa customer                   │
  │  5. Generate Medusa-compatible JWT (signed with          │
  │     Medusa's jwtSecret)                                 │
  │  6. Replace Authorization header with Medusa JWT        │
  └──────────────┬──────────────────────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Medusa's built-in authenticate() middleware            │
  │                                                         │
  │  Validates the (now Medusa-signed) JWT                  │
  │  Sets req.auth_context with actor_id, actor_type, etc.  │
  └──────────────┬──────────────────────────────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Route Handler                                          │
  │                                                         │
  │  req.auth_context.actor_id = Medusa customer ID         │
  │  req.auth_context.app_metadata = third-party data       │
  └─────────────────────────────────────────────────────────┘
```

---

## Customer Metadata

When a customer is auto-created (or found), the plugin stores the JWT
claims in `customer.metadata.third_party_auth`:

```json
{
  "third_party_auth": {
    "roles": ["selfservice_org_user", "selfservice_org_admin"],
    "permissions": { "...": "..." },
    "external_customer_id": "cus_01KGSR4NSX1S7Y48E6MVWPPVDP",
    "external_customer_name": "Acme Corporation",
    "customer_roles": ["selfservice_org_user"],
    "customer_permissions": { "...": "..." }
  }
}
```

---

## Error Responses

| Scenario             | HTTP Status | Error Type     | Message                                   |
|----------------------|-------------|----------------|-------------------------------------------|
| Missing token        | 401         | `unauthorized`  | Missing authentication token...           |
| Invalid token        | 401         | `unauthorized`  | Invalid authentication token: ...         |
| Expired token        | 401         | `unauthorized`  | Authentication token has expired          |
| Customer not found   | 422         | `invalid_data`  | Failed to resolve customer: ...           |

---

## Extracting to a Standalone NPM Package

The plugin is already structured for extraction:

1. Copy the `src/plugins/third-party-auth/` directory into a new git repo
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Publish: `npm publish`

In the consuming Medusa project:

```diff
# medusa-config.ts
-  resolve: "./src/plugins/third-party-auth/providers",
+  resolve: "@your-org/medusa-plugin-third-party-auth/providers",

# src/api/middlewares.ts
-import { ... } from "../plugins/third-party-auth"
+import { ... } from "@your-org/medusa-plugin-third-party-auth"
```

---

## License

MIT
