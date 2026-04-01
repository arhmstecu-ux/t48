
ALTER TABLE public.purchase_items DROP CONSTRAINT purchase_items_product_id_fkey;
ALTER TABLE public.purchase_items ADD CONSTRAINT purchase_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.reviews DROP CONSTRAINT reviews_product_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
