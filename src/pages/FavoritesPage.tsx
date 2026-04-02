import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { Heart } from "lucide-react";
import { toast } from "sonner";

interface FavoriteProperty {
  id: string;
  title: string;
  price: number;
  city: string;
  state: string;
  district: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  images: string[] | null;
  listing_type: string;
  property_type: string;
  status: string;
}

const FavoritesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const [properties, setProperties] = useState<FavoriteProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteProperties = async () => {
      if (favoriteIds.size === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }
      const ids = Array.from(favoriteIds).map(id => id.startsWith("db-") ? id.slice(3) : id);
      const { data } = await supabase
        .from("user_properties")
        .select("id, title, price, city, state, district, address, bedrooms, bathrooms, sqft, images, listing_type, property_type, status")
        .in("id", ids);
      setProperties(data ?? []);
      setLoading(false);
    };
    fetchFavoriteProperties();
  }, [favoriteIds]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleToggle = async (propertyId: string) => {
    const success = await toggleFavorite(propertyId);
    if (success) {
      if (isFavorite(propertyId)) {
        toast.success("Removed from favorites");
      } else {
        toast.success("Added to favorites");
      }
    }
  };

  const mappedProperties = properties.map((p) => ({
    id: `db-${p.id}`,
    title: p.title,
    price: p.price,
    address: p.address,
    city: p.city,
    state: p.state,
    district: p.district,
    beds: p.bedrooms,
    baths: p.bathrooms,
    sqft: p.sqft ?? 0,
    image: p.images?.[0] ?? "/placeholder.svg",
    images: p.images ?? [],
    listingType: p.listing_type as "sale" | "rent",
    type: p.property_type as "apartment" | "commercial" | "house" | "land",
    propertyType: p.property_type,
    isNew: false,
    yearBuilt: 0,
    description: "",
    features: [],
    agent: { name: "", phone: "", email: "" },
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-7 w-7 text-accent" />
          <h1 className="font-display text-3xl font-bold text-foreground">My Favorites</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : mappedProperties.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">No favorites yet</h2>
            <p className="text-muted-foreground">
              Click the heart icon on any property to save it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mappedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isFavorite={isFavorite(property.id)}
                onToggleFavorite={handleToggle}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FavoritesPage;
