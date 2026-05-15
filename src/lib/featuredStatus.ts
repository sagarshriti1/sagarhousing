import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface FeaturedFields {
  is_featured?: boolean | null;
  featured_expiration_date?: string | null;
  featured_payment_status?: string | null;
}

const safeParseDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  try {
    const normalized = (dateStr.includes(' ') && !dateStr.includes('T'))
      ? dateStr.replace(' ', 'T')
      : dateStr;
    const finalStr = (normalized.length === 10 && !normalized.includes('T'))
      ? `${normalized}T00:00:00`
      : normalized;
    const d = new Date(finalStr);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

/** True only if marked featured AND not past the featured expiration date. */
export const isFeaturedActive = (
  r: FeaturedFields | null | undefined,
): boolean => {
  if (!r || !r.is_featured) return false;
  const expDate = safeParseDate(r.featured_expiration_date);
  if (!expDate) return true;
  return expDate >= new Date(new Date().toDateString());
};

/** If row is flagged featured but expired, lazy-update DB. */
export const markFeaturedExpiredIfNeeded = async (
  realtorId: string,
  fields: FeaturedFields,
): Promise<boolean> => {
  if (!fields.is_featured || !fields.featured_expiration_date) return false;
  const expDate = safeParseDate(fields.featured_expiration_date);
  const expired = expDate && expDate < new Date(new Date().toDateString());

  if (!expired) return false;

  await supabase
    .from('realtors')
    .update({ is_featured: false, featured_payment_status: 'expired' })
    .eq('id', realtorId);
  return true;
};

// FIX: Generate the date using strictly local time parsing to prevent UTC "yesterday" shift
export const addOneMonthISO = (fromDateStr?: string | null): string => {
  let d = (fromDateStr ? safeParseDate(fromDateStr) : null) || new Date();
  d.setMonth(d.getMonth() + 1);
  return format(d, 'yyyy-MM-dd');
};

/** Returns today's date in YYYY-MM-DD format based on local time. */
export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd');
