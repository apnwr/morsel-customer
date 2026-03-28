# Morsel API Documentation

**Base URL:** `https://us-central1-morsel-db7d8.cloudfunctions.net/app/api/v1`
**Auth:** Bearer JWT (Firebase Authentication)
**Version:** 1.0.0

---

## Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/admin/register` | Register super admin | Public |
| `POST` | `/auth/admin/login` | Login super admin | Public |
| `POST` | `/auth/business/register` | Register business admin | Public |
| `POST` | `/auth/business/login` | Login business admin | Public |
| `POST` | `/auth/patron/register` | Register patron | Public |
| `POST` | `/auth/patron/login` | Login patron | Public |

## Business

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/business` | Get business info (super-admin or business-admin depending on implementation) | Auth |
| `PUT` | `/business` | Update business info | Auth |

## Staff

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/business/staff` | Create a new staff member | Auth |
| `GET` | `/business/staff` | List staff members for the business | Auth |
| `PUT` | `/business/staff/{staffId}` | Update a staff member | Auth |

## Branch

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/business/branch` | Add branch | Auth |
| `GET` | `/business/branch` | Get branch list | Auth |
| `GET` | `/business/branch/{branchId}` | Get branch by id | Auth |
| `PUT` | `/business/branch/{branchId}` | Update branch | Auth |

## Area

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/business/{branchId}/areas` | Create a new area under a branch | Auth |
| `GET` | `/business/{branchId}/areas` | Get all areas for a branch | Auth |
| `GET` | `/business/{branchId}/areas/{id}` | Get area by id | Auth |
| `PUT` | `/business/{branchId}/areas/{id}` | Update area | Auth |

## Space

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/business/{areaId}/spaces` | Create a new space within an area | Auth |
| `GET` | `/business/{areaId}/spaces` | Get all spaces in area | Auth |
| `GET` | `/business/{areaId}/spaces/{spaceId}` | Get space by ID | Auth |
| `PUT` | `/business/{areaId}/spaces/{spaceId}` | Update space | Auth |
| `DELETE` | `/business/{areaId}/spaces/{spaceId}` | Delete space | Auth |

## Menu

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/business/menus` | Create menu | Auth |
| `GET` | `/business/menus` | Get all menus | Auth |
| `GET` | `/business/menus/{menuId}` | Get menu by ID | Auth |
| `PUT` | `/business/menus/{menuId}` | Update menu | Auth |
| `DELETE` | `/business/menus/{menuId}` | Delete menu | Auth |

## OrderingSession

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ordering-session/{sessionId}` | Get session details (auto-end check performed) | Public |
| `PUT` | `/ordering-session/{sessionId}` | Update session (e.g., metadata) | Auth |
| `POST` | `/ordering-session/{sessionId}/participant` | Add participant to session (patron or guest) | Public |
| `PUT` | `/ordering-session/{sessionId}/end` | End session manually (business) | Auth |

## Order

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/orders` | Place an order (must include sessionId to link) | Public |
| `GET` | `/orders/{id}` | Get order by ID | Auth |
| `DELETE` | `/orders/{id}` | Delete order | Auth |
| `PUT` | `/orders/{id}/complete` | Mark order as completed by business | Auth |
| `POST` | `/orders/{id}/pay` | Pay for order (placeholder, supports cash/manual or online placeholder) | Public |

## Ordering Session - Patron

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/ordering-session/start` | Start or join an ordering session | Public |
| `GET` | `/ordering-session/session/{sessionId}/bill` | Get bill for an ordering session | Public |
| `POST` | `/ordering-session/session/{sessionId}/tip` | Add tip to ordering session | Public |
| `POST` | `/ordering-session/session/{sessionId}/tip/participant` | Add or update tip for a specific participant | Public |
| `DELETE` | `/ordering-session/session/{sessionId}/tip/participant` | Remove tip for a specific participant | Public |
| `GET` | `/ordering-session/session/{sessionId}/tips` | Get tips for an ordering session | Public |
| `POST` | `/ordering-session/session/{sessionId}/split` | Calculate bill split for a session | Public |
| `GET` | `/ordering-session/session/{sessionId}/ordered-items` | Get all ordered items for a session | Public |
| `GET` | `/ordering-session/space/{spaceId}` | Get space and active session info | Public |
| `GET` | `/ordering-session/session/{sessionId}` | Get session details | Public |
| `POST` | `/ordering-session/session/{sessionId}/participant` | Add participant to session | Public |
| `POST` | `/ordering-session/session/{sessionId}/queue` | Upsert order queue for session user | Public |
| `POST` | `/ordering-session/session/{sessionId}/queue/confirm` | Confirm queued items and create order | Public |
| `POST` | `/ordering-session/session/{sessionId}/call-attendant` | Call attendant for assistance | Public |
| `PUT` | `/ordering-session/session/{sessionId}/end` | End ordering session | Public |

## Ordering Session - Business

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ordering-session/session/{sessionId}/bill` | Get bill for an ordering session | Public |
| `POST` | `/ordering-session/session/{sessionId}/split` | Calculate bill split for a session | Public |
| `PUT` | `/ordering-session/session/{sessionId}/split/{splitIndex}/pay` | Mark a split as paid | Auth |
| `GET` | `/ordering-session/session/{sessionId}/ordered-items` | Get all ordered items for a session | Public |
| `PUT` | `/ordering-session/business/session/{sessionId}` | Update ordering session details | Auth |
| `PUT` | `/ordering-session/business/session/{sessionId}/change-space` | Change space assigned to session | Auth |
| `GET` | `/ordering-session/business/active` | Get all active ordering sessions for business | Auth |
| `PUT` | `/ordering-session/business/session/{sessionId}/assign-staff` | Assign staff member to session | Auth |
| `PUT` | `/ordering-session/business/session/{sessionId}/acknowledge-call` | Acknowledge attendant call | Auth |

## Orders - Business

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `PUT` | `/orders/{id}` | Edit order details | Auth |
| `PUT` | `/orders/{id}/status` | Update order status | Auth |
| `POST` | `/orders/{id}/split` | Split bill for an order | Auth |
| `GET` | `/orders/business` | Get all orders by business | Auth |
| `GET` | `/orders/history` | Get order history with pagination, search, and date filters | Auth |
| `GET` | `/orders/fetch/{id}` | Get order by ID | Auth |
| `GET` | `/orders/space/{spaceId}/session` | Get orders for active space session | Auth |
| `POST` | `/orders/space/{spaceId}/add` | Add order to space | Auth |
| `GET` | `/orders/incoming` | Get incoming confirmed orders | Auth |
| `PUT` | `/orders/{orderId}/workflow-status` | Update order workflow status | Auth |

## Menu - Public

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/business/menus/active/{businessId}` | Get all active menus with items for a business | Public |

## Items - Business

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `PUT` | `/business/items/{itemId}/taxes` | Assign taxes to a menu item | Auth |
| `POST` | `/business/items/bulk-assign-taxes` | Bulk assign taxes to multiple menu items | Auth |
| `POST` | `/business/items` | Create a new menu item | Auth |
| `POST` | `/business/items/{itemId}/addons` | Add an addon category to an existing menu item | Auth |

## Billing - Business

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/business/billing/config` | Get billing configuration | Auth |
| `GET` | `/business/billing/taxes` | Get all taxes | Auth |
| `POST` | `/business/billing/taxes` | Add tax configuration | Auth |
| `GET` | `/business/billing/taxes/{taxId}` | Get a specific tax | Auth |
| `PUT` | `/business/billing/taxes/{taxId}` | Update an existing tax | Auth |
| `DELETE` | `/business/billing/taxes/{taxId}` | Delete a tax | Auth |
| `GET` | `/business/billing/charges` | Get all charges | Auth |
| `POST` | `/business/billing/charges` | Add charge configuration | Auth |
| `GET` | `/business/billing/charges/{chargeId}` | Get a specific charge | Auth |
| `PUT` | `/business/billing/charges/{chargeId}` | Update an existing charge | Auth |
| `DELETE` | `/business/billing/charges/{chargeId}` | Delete a charge | Auth |

## Discounts - Business

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/discounts/business/discounts` | Create a new discount code | Auth |
| `GET` | `/discounts/business/discounts` | Get all discount codes | Auth |
| `GET` | `/discounts/business/discounts/{discountCodeId}` | Get a specific discount code | Auth |
| `PUT` | `/discounts/business/discounts/{discountCodeId}` | Update a discount code | Auth |
| `DELETE` | `/discounts/business/discounts/{discountCodeId}` | Delete a discount code | Auth |
| `POST` | `/discounts/business/discounts/validate` | Validate a discount code | Auth |
| `POST` | `/discount/sessions/{sessionId}/apply-discount` | Apply discount to a session | Auth |

## Discounts - Patron

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/discounts/sessions/{sessionId}/apply-discount-code` | Apply discount code to session (customer-facing) | Public |
| `DELETE` | `/discounts/sessions/{sessionId}/discount` | Remove discount from session | Auth |

## Ordering Session - Staff

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/ordering-session/staff/sessions` | Get all sessions assigned to staff | Auth |
| `PUT` | `/ordering-session/staff/session/{sessionId}` | Update assigned session | Auth |

## Workflow - Business

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/business/workflow/order/{branchId}` | Get order workflow for branch | Auth |
| `POST` | `/business/workflow/status/{branchId}` | Add workflow status to branch | Auth |
| `PUT` | `/business/workflow/status/{branchId}/{statusId}` | Update workflow status | Auth |
| `DELETE` | `/business/workflow/status/{branchId}/{statusId}` | Delete workflow status | Auth |
| `PUT` | `/business/workflow/reorder/{branchId}` | Reorder workflow statuses | Auth |
| `POST` | `/business/workflow/setup-default/{branchId}` | Setup default 5-step workflow | Auth |

## Secrets

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/business/secrets` | Store encrypted secret (ciphertext) for a business | Auth |
| `GET` | `/business/secrets/{name}` | Retrieve ciphertext for a business secret | Auth |

---

## Schemas

### SecretPayload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Identifier for the secret (e.g., 'peach_creds') |
| `ciphertext` | `string` | Yes | Base64/UTF-8 encoded ciphertext produced by the business; server stores ciphertext as-is |
| `description` | `string` | No | Optional human-friendly description |

### SecretResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `secret` | `object` | No |  |

### Totals

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subtotal` | `number` | No |  |
| `taxes` | `object` | No | Tax breakdown |
| `total` | `number` | No | Total amount (includes taxes) |

### PaymentIntentRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | No |  |
| `orderIds` | `array` | Yes |  |
| `currency` | `string` | No |  |
| `payerId` | `string` | No |  |
| `splits` | `array` | No |  |
| `totals` | `object` | No |  |

### PaymentIntentResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | No |  |
| `sessionId` | `string` | No |  |
| `orderIds` | `array` | No |  |
| `totals` | `object` | No |  |
| `currency` | `string` | No |  |

### CardPayload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `number` | `string` | Yes |  |
| `holder` | `string` | Yes |  |
| `expiryMonth` | `string` | Yes |  |
| `expiryYear` | `string` | Yes |  |
| `cvv` | `string` | Yes |  |
| `brand` | `string` | No |  |

### SimplePurchaseRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transactionId` | `string` | Yes |  |
| `card` | `object` | Yes |  |
| `clientId` | `string` | No | Optional client identifier to fetch per-client keys from KeyStore |

### EmbeddedCheckoutRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transactionId` | `string` | Yes |  |
| `returnUrl` | `string` | No |  |
| `clientId` | `string` | No |  |

### EmbeddedCheckoutResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `checkout` | `object` | No |  |

### ConfirmPaymentRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gatewayTransactionId` | `string` | Yes |  |
| `clientId` | `string` | No |  |

### TransactionModel

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | No |  |
| `status` | `string` | No |  |
| `payments` | `array` | No |  |
| `totals` | `object` | No |  |
