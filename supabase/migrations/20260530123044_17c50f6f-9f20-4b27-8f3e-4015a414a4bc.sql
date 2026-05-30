INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-images', 'journal-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Journal images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'journal-images');

CREATE POLICY "Authenticated users can upload journal images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'journal-images');

CREATE POLICY "Users can update their own journal images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'journal-images' AND owner = auth.uid());

CREATE POLICY "Users can delete their own journal images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'journal-images' AND owner = auth.uid());