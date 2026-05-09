-- Add oshi_member_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS oshi_member_id integer;

-- Drop coin/spin/voucher/level/replay-purchase related functions
DROP FUNCTION IF EXISTS public.spend_coins(integer, text, text);
DROP FUNCTION IF EXISTS public.purchase_replay(uuid);
DROP FUNCTION IF EXISTS public.spin_wheel();
DROP FUNCTION IF EXISTS public.allocate_spins_on_purchase() CASCADE;
DROP FUNCTION IF EXISTS public.create_coin_balance_for_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_level_for_profile() CASCADE;
DROP FUNCTION IF EXISTS public.increment_voucher_used() CASCADE;
DROP FUNCTION IF EXISTS public.guard_user_spins_update() CASCADE;

-- Drop coin/spin related tables
DROP TABLE IF EXISTS public.spin_results CASCADE;
DROP TABLE IF EXISTS public.spin_prizes CASCADE;
DROP TABLE IF EXISTS public.user_spins CASCADE;
DROP TABLE IF EXISTS public.coin_topup_requests CASCADE;
DROP TABLE IF EXISTS public.coin_transactions CASCADE;
DROP TABLE IF EXISTS public.coin_balances CASCADE;
DROP TABLE IF EXISTS public.replay_purchases CASCADE;
DROP TABLE IF EXISTS public.user_levels CASCADE;
DROP TABLE IF EXISTS public.level_rewards CASCADE;
DROP TABLE IF EXISTS public.voucher_usage CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;

-- Drop coin_price column from products
ALTER TABLE public.products DROP COLUMN IF EXISTS coin_price;