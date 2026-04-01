import { useState, useMemo, useEffect } from "react";
import type { Property } from "@/data/properties";
import { supabase } from "@/integrations/supabase/client";
import PropertyCard from "@/components/PropertyCard";
import FilterBar from "@/components/FilterBar";

const FeaturedListings = ({ heroListingType }: { heroListingType?: string }) => {
  const [listingType, setListingType] = useState("all");
  const [propertyType, setPropertyType] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [beds, setBeds] = useState("all");
  const [dbProperties, setDbProperties] = useState<Property[]>([]);

  useEffect(() => {
    const fetchDbProperties = async () => {
      const { data } = await supabase
        .from("user_properties")
        .select("*")
        .eq("status", "active");

      if (data) {
        const mapped: Property[] = data.map((p) => ({
          id: `db-${p.id}`,
          title: p.title,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip_code,
          price: Number(p.price),
          beds: p.bedrooms,
          baths: Number(p.bathrooms),
          sqft: p.sqft ?? 0,
          type: p.property_type as Property["type"],
          listingType: p.listing_type as Property["listingType"],
          image: p.images?.[0] ?? "/placeholder.svg",
          images: p.images ?? [],
          yearBuilt: p.year_built ?? 2000,
          description: p.description ?? "",
          features: p.features ?? [],
          isNew: new Date(p.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
          agent: { name: "", phone: "", email: "" },
        }));
        setDbProperties(mapped);
      }
    };
    fetchDbProperties();
  }, []);

  const allProperties = useMemo(() => [...dbProperties, ...properties], [dbProperties]);

  const effectiveListingType = listingType !== "all" ? listingType : heroListingType ?? "all";

  const filtered = useMemo(() => {
    return allProperties.filter((p) => {
      if (effectiveListingType !== "all" && p.listingType !== effectiveListingType) return false;
      if (propertyType !== "all" && p.type !== propertyType) return false;
      if (beds !== "all" && p.beds < parseInt(beds)) return false;
      if (priceRange !== "all") {
        const [min, max] = priceRange.split("-").map(Number);
        if (p.price < min || p.price > max) return false;
      }
      return true;
    });
  }, [effectiveListingType, propertyType, priceRange, beds, allProperties]);

  return (
    <section className="container py-12">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Featured Listings</h2>
          <p className="text-muted-foreground mt-1">{filtered.length} properties found</p>
        </div>
      </div>

      <FilterBar
        listingType={listingType}
        setListingType={setListingType}
        propertyType={propertyType}
        setPropertyType={setPropertyType}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        beds={beds}
        setBeds={setBeds}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No properties match your filters.</p>
        </div>
      )}
    </section>
  );
};

export default FeaturedListings;
