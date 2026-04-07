-- Drop and re-create all triggers

DROP TRIGGER IF EXISTS generate_profile_code_trigger ON public.profiles;
DROP TRIGGER IF EXISTS create_coin_balance_trigger ON public.profiles;
DROP TRIGGER IF EXISTS create_user_level_trigger ON public.profiles;
DROP TRIGGER IF EXISTS notify_new_announcement_trigger ON public.announcements;
DROP TRIGGER IF EXISTS notify_new_product_trigger ON public.products;
DROP TRIGGER IF EXISTS allocate_spins_trigger ON public.purchases;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER generate_profile_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW WHEN (NEW.profile_code IS NULL)
  EXECUTE FUNCTION public.generate_profile_code();

CREATE TRIGGER create_coin_balance_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_coin_balance_for_user();

CREATE TRIGGER create_user_level_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_user_level_for_profile();

CREATE TRIGGER notify_new_announcement_trigger
  AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_announcement();

CREATE TRIGGER notify_new_product_trigger
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_product();

CREATE TRIGGER allocate_spins_trigger
  AFTER UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.allocate_spins_on_purchase();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();