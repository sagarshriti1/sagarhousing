CREATE SEQUENCE IF NOT EXISTS public.user_properties_code_seq;

ALTER TABLE public.user_properties
ADD COLUMN IF NOT EXISTS property_code BIGINT UNIQUE;

UPDATE public.user_properties
SET property_code = nextval('public.user_properties_code_seq')
WHERE property_code IS NULL;

ALTER TABLE public.user_properties
ALTER COLUMN property_code SET DEFAULT nextval('public.user_properties_code_seq'),
ALTER COLUMN property_code SET NOT NULL;

ALTER SEQUENCE public.user_properties_code_seq OWNED BY public.user_properties.property_code;