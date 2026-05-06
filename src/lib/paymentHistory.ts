import { supabase } from "@/integrations/supabase/client";

export type PaymentStatus = "paid" | "bypassed" | "promotion" | "free";

export interface LogPaymentInput {
  user_id: string; // owner of the service (the user being charged)
  service_key: string;
  service_label: string;
  related_type?: "realtor" | "property" | null;
  related_id?: string | null;
  related_label?: string | null;
  amount: number;
  status: PaymentStatus;
  promo_label?: string | null;
  expiration_date?: string | null;
  notes?: string | null;
}

export const SERVICE_LABELS: Record<string, string> = {
  realtor_signup: "Realtor Signup",
  realtor_renewal: "Realtor Renewal",
  property_listing_sale: "Property Listing — For Sale",
  property_listing_rent: "Property Listing — For Rent",
  featured_realtor: "Featured Realtor",
};

/**
 * Logs a payment event. Captures the auth user actually performing the action
 * (admin vs the user themselves) for full transparency on both sides.
 */
export const logPayment = async (input: LogPaymentInput) => {
  try {
    const { data: { user: actor } } = await supabase.auth.getUser();
    let processed_by_role: "admin" | "user" | "self" = "self";
    let processed_by_name: string | null = null;

    if (actor) {
      // Determine if the actor is an admin
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", actor.id)
        .maybeSingle();
      const actorRole = roleRow?.role;

      if (actor.id !== input.user_id && actorRole === "admin") {
        processed_by_role = "admin";
      } else if (actor.id === input.user_id) {
        processed_by_role = "self";
      } else {
        processed_by_role = "user";
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", actor.id)
        .maybeSingle();
      processed_by_name = profile?.display_name || profile?.email || actor.email || null;
    }

    await supabase.from("payment_history").insert({
      user_id: input.user_id,
      service_key: input.service_key,
      service_label: input.service_label || SERVICE_LABELS[input.service_key] || input.service_key,
      related_type: input.related_type ?? null,
      related_id: input.related_id ?? null,
      related_label: input.related_label ?? null,
      amount: input.amount,
      status: input.status,
      promo_label: input.promo_label ?? null,
      processed_by: actor?.id ?? null,
      processed_by_role,
      processed_by_name,
      expiration_date: input.expiration_date ?? null,
      notes: input.notes ?? null,
    });
  } catch (e) {
    console.error("Failed to log payment history", e);
  }
};
