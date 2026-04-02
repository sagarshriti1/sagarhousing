import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSavedRealtors = () => {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("saved_realtors")
      .select("realtor_id")
      .eq("user_id", user.id);
    setSavedIds(new Set((data ?? []).map((r: any) => r.realtor_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const toggleSaved = useCallback(
    async (realtorId: string) => {
      if (!user) return false;

      const isSaved = savedIds.has(realtorId);
      // Optimistic update
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(realtorId);
        else next.add(realtorId);
        return next;
      });

      if (isSaved) {
        const { error } = await supabase
          .from("saved_realtors")
          .delete()
          .eq("user_id", user.id)
          .eq("realtor_id", realtorId);
        if (error) {
          setSavedIds((prev) => new Set(prev).add(realtorId));
          return false;
        }
      } else {
        const { error } = await supabase
          .from("saved_realtors")
          .insert({ user_id: user.id, realtor_id: realtorId });
        if (error) {
          setSavedIds((prev) => {
            const next = new Set(prev);
            next.delete(realtorId);
            return next;
          });
          return false;
        }
      }
      return true;
    },
    [user, savedIds]
  );

  const isSaved = useCallback(
    (realtorId: string) => savedIds.has(realtorId),
    [savedIds]
  );

  return { savedIds, isSaved, toggleSaved, loading, refetch: fetchSaved };
};
