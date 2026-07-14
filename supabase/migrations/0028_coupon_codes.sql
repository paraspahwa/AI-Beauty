-- ============================================================
-- Coupon Codes — influencer seeding + promotional discounts
-- ============================================================

create table if not exists public.coupon_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  discount_type   text not null default 'percentage',  -- percentage | fixed
  discount_value  integer not null,                     -- e.g. 100 for 100% (free), or 50 for 50%
  max_uses        integer not null default 1,
  use_count       integer not null default 0,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  granted_by      uuid references public.profiles(id),
  note            text,                                  -- e.g. "Influencer: @beautytiktok"
  created_at      timestamptz not null default now()
);

-- RLS
alter table public.coupon_codes enable row level security;

create policy "Anyone can check coupon codes"
  on public.coupon_codes for select
  using (true);

create policy "Service role can manage coupons"
  on public.coupon_codes for all
  to service_role
  using (true)
  with check (true);

-- Function to validate and apply a coupon
create or replace function public.apply_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupon_codes%rowtype;
begin
  select * into v_coupon
  from public.coupon_codes
  where code = upper(trim(p_code))
    and is_active = true
    and (expires_at is null or expires_at > now())
    and use_count < max_uses
  limit 1;

  if v_coupon.id is null then
    return jsonb_build_object('valid', false, 'error', 'Invalid or expired coupon code');
  end if;

  -- Increment use count
  update public.coupon_codes
  set use_count = use_count + 1
  where id = v_coupon.id;

  return jsonb_build_object(
    'valid', true,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'note', v_coupon.note
  );
end;
$$;

grant usage on schema public to service_role;
grant all on public.coupon_codes to service_role;
grant execute on function public.apply_coupon to service_role;
