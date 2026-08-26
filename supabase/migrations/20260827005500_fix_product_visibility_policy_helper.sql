-- The authenticated product-read RLS policy calls this helper. The helper lives in
-- the non-exposed private schema, but authenticated still needs EXECUTE for policy evaluation.

revoke all on function private.is_loyalty_product_in_my_wallet(uuid) from public, anon;
grant execute on function private.is_loyalty_product_in_my_wallet(uuid) to authenticated;
