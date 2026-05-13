import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  fee: number;
  bypass_payment: boolean;
  promo_label: string | null;
  promo_ends_at: string | null;
}

export const FEATURE_KEYS = {
  PROPERTY_SALE: "property_listing_sale",
  PROPERTY_RENT: "property_listing_rent",
  REALTOR_SIGNUP: "realtor_signup",
  REALTOR_RENEWAL: "realtor_renewal",
  FEATURED_REALTOR: "featured_realtor",
  NON_REALTOR_LIMIT_BYPASS: "non_realtor_limit_bypass",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

const isPromoActive = (flag: FeatureFlag) => {
  if (!flag.bypass_payment) return false;
  if (!flag.promo_ends_at) return true;
  return new Date(flag.promo_ends_at).getTime() > Date.now();
};

export const useFeatureFlag = (key: FeatureKey) => {
  const [flag, setFlag] = useState<FeatureFlag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("feature_flags")
      .select("*")
      .eq("key", key)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setFlag((data as FeatureFlag) ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key]);

  return {
    flag,
    loading,
    fee: flag?.fee ?? 0,
    isFree: flag ? isPromoActive(flag) : false,
    promoLabel: flag?.promo_label ?? null,
    promoEndsAt: flag?.promo_ends_at ?? null,
  };
};
