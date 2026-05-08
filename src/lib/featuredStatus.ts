import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface FeaturedFields {
  is_featured?: boolean | null;
  featured_expiration_date?: string | null;
  featured_payment_status?: string | null;
}

/** True only if marked featured AND not past the featured expiration date. */
export const isFeaturedActive = (
  r: FeaturedFields | null | undefined,
): boolean => {
  if (!r || !r.is_featured) return false;
  if (!r.featured_expiration_date) return true;
  return (
    new Date(r.featured_expiration_date) >= new Date(new Date().toDateString())
  );
};

/** If row is flagged featured but expired, lazy-update DB. */
export const markFeaturedExpiredIfNeeded = async (
  realtorId: string,
  fields: FeaturedFields,
): Promise<boolean> => {
  if (!fields.is_featured || !fields.featured_expiration_date) return false;
  const expired =
    new Date(fields.featured_expiration_date) <
    new Date(new Date().toDateString());
  if (!expired) return false;
  await supabase
    .from('realtors')
    .update({ is_featured: false, featured_payment_status: 'expired' })
    .eq('id', realtorId);
  return true;
};

export const addOneMonthISO = (fromDateStr?: string | null): string => {
  const d = fromDateStr ? new Date(fromDateStr) : new Date();
  d.setMonth(d.getMonth() + 1);
  // Ensure we use local format to avoid timezone shifting
  return format(d, 'yyyy-MM-dd');
};

/** Returns today's date in YYYY-MM-DD format based on local time. */
export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd');
