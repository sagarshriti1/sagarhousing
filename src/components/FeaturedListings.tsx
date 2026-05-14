import { useState, useMemo, useEffect } from "react";
import type { Property } from "@/data/properties";
import { supabase } from "@/integrations/supabase/client";
import PropertyCard from "@/components/PropertyCard";
import FilterBar from "@/components/FilterBar";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";

const FeaturedListings = ({ heroListingType, realtorId }: { heroListingType?: string, realtorId?: string | null }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [listingType, setListingType] = useState(heroListingType === "rent" ? "rent" : heroListingType === "sale" ? "sale" : "all");
  const [realtorName, setRealtorName] = useState<string | null>(null);

  useEffect(() => {
    if (realtorId) {
      const fetchRealtor = async () => {
        const { data } = await supabase.from('realtors').select('name').eq('user_id', realtorId).maybeSingle();
        if (data && data.name) setRealtorName(data.name);
      };
      fetchRealtor();
    }
  }, [realtorId]);

  useEffect(() => {
    if (heroListingType === "sale") setListingType("sale");
    else if (heroListingType === "rent") setListingType("rent");
  }, [heroListingType]);
  const [propertyType, setPropertyType] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [beds, setBeds] = useState("all");
  const [baths, setBaths] = useState("all");
  const [sqmMin, setSqmMin] = useState("");
  const [sqmMax, setSqmMax] = useState("");
  const [yearBuilt, setYearBuilt] = useState("all");
  const [maintenanceFee, setMaintenanceFee] = useState("all");
  const [bikeParkingSpaces, setBikeParkingSpaces] = useState("0");
  const [carParkingSpaces, setCarParkingSpaces] = useState("0");
  const [stories, setStories] = useState("0");
  const [keywords, setKeywords] = useState("");
  const [district, setDistrict] = useState("all");
  const [city, setCity] = useState("all");
  const [dbProperties, setDbProperties] = useState<Property[]>([]);

  useEffect(() => {
    const fetchDbProperties = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from("user_properties")
        .select("*")
        .eq("status", "active")
        .or(`expiration_date.is.null,expiration_date.gte.${todayStr}`);

      if (data) {
        const mapped: Property[] = data.map((p) => ({
          id: `db-${p.id}`,
          title: p.title,
          address: p.address,
          city: p.city,
          district: (p as any).district ?? '',
          price: Number(p.price),
          beds: p.bedrooms,
          baths: Number(p.bathrooms),
          sqft: p.sqft ?? 0,
          type: p.property_type as Property["type"],
          listingType: p.listing_type as Property["listingType"],
          user_id: p.user_id,
          image: p.images?.[0] ?? "/placeholder.svg",
          images: p.images ?? [],
          propertyCode: p.property_code,
          yearBuilt: p.year_built ?? 2000,
          description: p.description ?? "",
          features: p.features ?? [],
          isNew: new Date(p.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
          maintenanceFee: p.maintenance_fee ? Number(p.maintenance_fee) : 0,
          bikeParkingSpaces: p.bike_parking ?? 0,
          carParkingSpaces: p.car_parking ?? 0,
          stories: p.stories ?? 0,
          agent: { name: "", phone: "", email: "" },
        }));
        setDbProperties(mapped);
      }
    };
    fetchDbProperties();
  }, []);

  const allProperties = dbProperties;

  const effectiveListingType = listingType !== "all" ? listingType : heroListingType ?? "all";

  const filtered = useMemo(() => {
    return allProperties.filter((p) => {
      if (realtorId && p.user_id !== realtorId) return false;
      if (effectiveListingType !== "all" && p.listingType !== effectiveListingType) return false;
      if (propertyType !== "all" && p.type !== propertyType) return false;
      if (beds !== "all" && p.beds < parseInt(beds)) return false;
      if (baths !== "all" && p.baths < parseInt(baths)) return false;
      if (sqmMin && p.sqft < parseInt(sqmMin)) return false;
      if (sqmMax && p.sqft > parseInt(sqmMax)) return false;
      if (yearBuilt !== "all" && p.yearBuilt < parseInt(yearBuilt)) return false;
      if (priceRange !== "all") {
        const [min, max] = priceRange.split("-").map(Number);
        if (p.price < min || p.price > max) return false;
      }
      if (maintenanceFee !== "all") {
        const [, max] = maintenanceFee.split("-").map(Number);
        if ((p.maintenanceFee ?? 0) > max) return false;
      }
      if (parseInt(bikeParkingSpaces) > 0 && (p.bikeParkingSpaces ?? 0) < parseInt(bikeParkingSpaces)) return false;
      if (parseInt(carParkingSpaces) > 0 && (p.carParkingSpaces ?? 0) < parseInt(carParkingSpaces)) return false;
      if (parseInt(stories) > 0 && (p.stories ?? 0) < parseInt(stories)) return false;
      if (district !== "all" && (p.district ?? '') !== district) return false;
      if (city !== "all" && p.city !== city) return false;
      if (keywords.trim()) {
        const kw = keywords.toLowerCase();
        const searchable = `${p.title} ${p.address} ${p.city} ${p.district ?? ''} ${p.description} ${p.features?.join(" ") ?? ""}`.toLowerCase();
        if (!searchable.includes(kw)) return false;
      }
      return true;
    });
  }, [effectiveListingType, propertyType, priceRange, beds, baths, sqmMin, sqmMax, yearBuilt, maintenanceFee, bikeParkingSpaces, carParkingSpaces, stories, district, city, keywords, allProperties]);

  return (
    <section className="container py-12">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">
             {realtorName ? `${realtorName}'s Listings` : "Featured Listings"}
          </h2>
          <p className="text-muted-foreground mt-1">{filtered.length} properties found</p>
        </div>
      </div>

      <FilterBar
        listingType={listingType}
        setListingType={setListingType}
        propertyType={propertyType}
        setPropertyType={setPropertyType}
        city={city}
        setCity={setCity}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        beds={beds}
        setBeds={setBeds}
        baths={baths}
        setBaths={setBaths}
        sqmMin={sqmMin}
        setSqmMin={setSqmMin}
        sqmMax={sqmMax}
        setSqmMax={setSqmMax}
        yearBuilt={yearBuilt}
        setYearBuilt={setYearBuilt}
        maintenanceFee={maintenanceFee}
        setMaintenanceFee={setMaintenanceFee}
        bikeParkingSpaces={bikeParkingSpaces}
        setBikeParkingSpaces={setBikeParkingSpaces}
        carParkingSpaces={carParkingSpaces}
        setCarParkingSpaces={setCarParkingSpaces}
        stories={stories}
        setStories={setStories}
        keywords={keywords}
        setKeywords={setKeywords}
        district={district}
        setDistrict={setDistrict}
        availableCities={[...new Set(allProperties.map(p => p.city).filter(Boolean))].sort()}
        onReset={() => {
          setListingType("all");
          setPropertyType("all");
          setCity("all");
          setPriceRange("all");
          setBeds("all");
          setBaths("all");
          setSqmMin("");
          setSqmMax("");
          setYearBuilt("all");
          setMaintenanceFee("all");
          setBikeParkingSpaces("0");
          setCarParkingSpaces("0");
          setStories("0");
          setKeywords("");
          setDistrict("all");
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            isFavorite={isFavorite(property.id)}
            onToggleFavorite={async (id) => {
              const success = await toggleFavorite(id);
              if (success) toast.success(isFavorite(id) ? "Removed from favorites" : "Added to favorites");
            }}
          />
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
