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
  // FIX: Force local midnight parsing for correct evaluation
  const expDate = new Date(
    r.featured_expiration_date.includes('T')
      ? r.featured_expiration_date
      : `${r.featured_expiration_date}T00:00:00`,
  );
  return expDate >= new Date(new Date().toDateString());
};

/** If row is flagged featured but expired, lazy-update DB. */
export const markFeaturedExpiredIfNeeded = async (
  realtorId: string,
  fields: FeaturedFields,
): Promise<boolean> => {
  if (!fields.is_featured || !fields.featured_expiration_date) return false;
  // FIX: Force local midnight parsing
  const expDate = new Date(
    fields.featured_expiration_date.includes('T')
      ? fields.featured_expiration_date
      : `${fields.featured_expiration_date}T00:00:00`,
  );
  const expired = expDate < new Date(new Date().toDateString());

  if (!expired) return false;

  await supabase
    .from('realtors')
    .update({ is_featured: false, featured_payment_status: 'expired' })
    .eq('id', realtorId);
  return true;
};

// FIX: Generate the date using strictly local time parsing to prevent UTC "yesterday" shift
export const addOneMonthISO = (fromDateStr?: string | null): string => {
  let d: Date;
  if (fromDateStr) {
    d = new Date(
      fromDateStr.includes('T') ? fromDateStr : `${fromDateStr}T00:00:00`,
    );
  } else {
    d = new Date();
  }
  d.setMonth(d.getMonth() + 1);
  return format(d, 'yyyy-MM-dd');
};

/** Returns today's date in YYYY-MM-DD format based on local time. */
export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd');
