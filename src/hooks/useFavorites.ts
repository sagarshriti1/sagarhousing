import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("favorites")
      .select("property_id")
      .eq("user_id", user.id);
    setFavoriteIds(new Set((data ?? []).map((f: any) => f.property_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(
    async (propertyId: string) => {
      if (!user) return false;

      // Strip "db-" prefix for database operations
      const dbId = propertyId.startsWith("db-") ? propertyId.slice(3) : propertyId;
      const isFav = favoriteIds.has(propertyId);
      // Optimistic update
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(propertyId);
        else next.add(propertyId);
        return next;
      });

      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", dbId);
        if (error) {
          // Revert
          setFavoriteIds((prev) => new Set(prev).add(propertyId));
          return false;
        }
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, property_id: dbId });
        if (error) {
          // Revert
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(propertyId);
            return next;
          });
          return false;
        }
      }
      return true;
    },
    [user, favoriteIds]
  );

  const isFavorite = useCallback(
    (propertyId: string) => favoriteIds.has(propertyId),
    [favoriteIds]
  );

  return { favoriteIds, isFavorite, toggleFavorite, loading, refetch: fetchFavorites };
};
