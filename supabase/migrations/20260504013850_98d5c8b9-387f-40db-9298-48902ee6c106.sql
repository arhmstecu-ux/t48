insert into storage.buckets (id, name, public) values ('paid-live', 'paid-live', true) on conflict (id) do nothing;

create policy "Public read paid-live"
on storage.objects for select
using (bucket_id = 'paid-live');

create policy "Admins upload paid-live"
on storage.objects for insert to authenticated
with check (bucket_id = 'paid-live' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins update paid-live"
on storage.objects for update to authenticated
using (bucket_id = 'paid-live' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete paid-live"
on storage.objects for delete to authenticated
using (bucket_id = 'paid-live' and has_role(auth.uid(), 'admin'::app_role));