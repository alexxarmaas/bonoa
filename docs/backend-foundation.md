# Bonoa backend foundation

Supabase project: `bonoa` (`eu-west-1`).

## Core domain

- `profiles`: authenticated user profile.
- `businesses`: establishments issuing loyalty products.
- `business_members`: owner/manager/staff access to a business.
- `loyalty_products`: reusable product/template for passes.
- `wallets`: one wallet per authenticated user with rotatable public token/version.
- `passes`: purchased or assigned loyalty passes.
- `redemptions`: immutable consumption ledger.

## Security model

RLS is enabled for all public domain tables from the first migration.

Customers can read their own profile, wallet, passes and redemptions. Business members can read their business data and operate passes for businesses they belong to. Managers/owners can manage business metadata, members and loyalty products.

Direct inserts/updates/deletes on `redemptions` are revoked from client roles. Consumption goes through the `redeem_pass()` RPC, which locks the pass row, validates membership/status/expiry/balance, applies the decrement and records an idempotent redemption in one transaction.

Internal trigger/RLS helper functions live in the `private` schema and are not exposed by the REST API.

## Auth lifecycle

A new `auth.users` row automatically creates:

1. `profiles` row
2. `wallets` row

The wallet QR currently has `public_token` + `qr_version`; the frontend demo token will be replaced by server-issued/rotated payloads in the QR integration phase.
