-- Check tenant authorization before returning an existing redemption.
CREATE OR REPLACE FUNCTION public.redeem_pass(target_pass_id uuid, units_to_redeem numeric, request_id uuid)
 RETURNS redemptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_pass public.passes;
  target_type public.loyalty_product_type;
  existing_redemption public.redemptions;
  created_redemption public.redemptions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if request_id is null then raise exception 'request_id is required'; end if;
  if units_to_redeem is null or units_to_redeem <= 0 then raise exception 'units_to_redeem must be greater than zero'; end if;
  if units_to_redeem <> round(units_to_redeem, 2) then raise exception 'units_to_redeem supports at most two decimals'; end if;

  select * into existing_redemption from public.redemptions where idempotency_key = request_id;
  if found then
    if not private.is_business_member(existing_redemption.business_id) then raise exception 'not authorized for this business'; end if;
    if existing_redemption.pass_id is distinct from target_pass_id or existing_redemption.units is distinct from units_to_redeem then raise exception 'request_id has already been used for another redemption'; end if;
    return existing_redemption;
  end if;

  select * into target_pass from public.passes where id = target_pass_id for update;
  if not found then raise exception 'pass not found'; end if;
  if not private.is_business_member(target_pass.business_id) then raise exception 'not authorized for this business'; end if;
  if target_pass.status <> 'active' then raise exception 'pass is not active'; end if;
  if target_pass.expires_at is not null and target_pass.expires_at <= now() then raise exception 'pass is expired'; end if;

  select lp.type into target_type from public.loyalty_products lp where lp.id = target_pass.loyalty_product_id;
  if target_type = 'uses' and units_to_redeem <> trunc(units_to_redeem) then raise exception 'use-based passes require whole units'; end if;
  if target_pass.remaining_units < units_to_redeem then raise exception 'insufficient remaining units'; end if;

  update public.passes
  set remaining_units = remaining_units - units_to_redeem,
      status = case when remaining_units - units_to_redeem = 0 then 'exhausted'::public.pass_status else status end
  where id = target_pass.id;

  insert into public.redemptions (pass_id, business_id, units, performed_by, idempotency_key)
  values (target_pass.id, target_pass.business_id, units_to_redeem, auth.uid(), request_id)
  returning * into created_redemption;
  return created_redemption;
end;
$function$
