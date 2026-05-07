
REVOKE EXECUTE ON FUNCTION public.get_public_profiles_by_codes(text[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles_by_ids(uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_public_profiles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_paid_livestream_public() FROM public;
REVOKE EXECUTE ON FUNCTION public.spend_coins(int, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.purchase_replay(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_replay_videos() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spin_wheel() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_contact() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_paid_m3u8_url(text) FROM public;
REVOKE EXECUTE ON FUNCTION public.verify_replay_password(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_ranking_data() FROM anon;

GRANT EXECUTE ON FUNCTION public.get_public_profiles_by_codes(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles_by_ids(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paid_livestream_public() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.spend_coins(int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_replay(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_replay_videos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_contact() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paid_m3u8_url(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_replay_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranking_data() TO authenticated;
