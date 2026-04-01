
-- Add new values to property_type enum
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'commercial';
ALTER TYPE public.property_type ADD VALUE IF NOT EXISTS 'land';
