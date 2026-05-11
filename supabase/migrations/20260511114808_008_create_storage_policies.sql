/*
  # Create Storage Policies for Documents and Avatars

  1. Storage Buckets
    - `documents` - For KYC, loan, and collateral documents (public read)
    - `avatars` - For user profile photos (public read)

  2. Policies
    - Authenticated users can upload documents and avatars
    - Anyone can read documents and avatars (public buckets)
    - Users can only delete their own uploads
*/

-- Documents bucket policies
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can read documents"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'documents');

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars bucket policies
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can read avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);