DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;

CREATE POLICY "Anonymous can submit valid lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  mobile IS NOT NULL
  AND length(btrim(mobile)) BETWEEN 7 AND 20
  AND status = 'new'
  AND remarks IS NULL
  AND (email IS NULL OR length(email) <= 255)
  AND (name IS NULL OR length(name) <= 120)
  AND (city IS NULL OR length(city) <= 120)
  AND (message IS NULL OR length(message) <= 2000)
);