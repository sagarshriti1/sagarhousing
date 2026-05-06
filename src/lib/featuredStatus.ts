import { supabase } from "@/integrations/supabase/client";

export interface FeaturedFields {
  is_featured?: boolean | null;
  featured_expiration_date?: string | null;
  featured_payment_status?: string | null;
}

/** True only if marked featured AND not past the featured expiration date. */
export const isFeaturedActive = (r: FeaturedFields | null | undefined): boolean => {
  if (!r || !r.is_featured) return false;
  if (!r.featured_expiration_date) return true; // legacy rows w/o term: still considered active
  return new Date(r.featured_expiration_date) >= new Date(new Date().toDateString());
};

/** If row is flagged featured but expired, lazy-update DB (fire-and-forget). */
export const markFeaturedExpiredIfNeeded = async (
  realtorId: string,
  fields: FeaturedFields,
): Promise<boolean> => {
  if (!fields.is_featured || !fields.featured_expiration_date) return false;
  const expired = new Date(fields.featured_expiration_date) < new Date(new Date().toDateString());
  if (!expired) return false;
  await supabase
    .from("realtors")
    .update({ is_featured: false, featured_payment_status: "expired" })
    .eq("id", realtorId);
  return true;
};

export const addOneMonthISO = (fromDateStr?: string | null): string => {
  const d = fromDateStr ? new Date(fromDateStr) : new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};

export const todayISO = (): string => new Date().toISOString().split("T")[0];
