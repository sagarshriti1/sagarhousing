import { useState, useMemo } from "react";
import { properties } from "@/data/properties";
import PropertyCard from "@/components/PropertyCard";
import FilterBar from "@/components/FilterBar";

const FeaturedListings = () => {
  const [listingType, setListingType] = useState("all");
  const [propertyType, setPropertyType] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [beds, setBeds] = useState("all");

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (listingType !== "all" && p.listingType !== listingType) return false;
      if (propertyType !== "all" && p.type !== propertyType) return false;
      if (beds !== "all" && p.beds < parseInt(beds)) return false;
      if (priceRange !== "all") {
        const [min, max] = priceRange.split("-").map(Number);
        if (p.price < min || p.price > max) return false;
      }
      return true;
    });
  }, [listingType, propertyType, priceRange, beds]);

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
