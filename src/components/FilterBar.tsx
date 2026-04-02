import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { NEPAL_DISTRICTS } from "@/data/nepalLocations";

interface FilterBarProps {
  listingType: string;
  setListingType: (v: string) => void;
  propertyType: string;
  setPropertyType: (v: string) => void;
  priceRange: string;
  setPriceRange: (v: string) => void;
  beds: string;
  setBeds: (v: string) => void;
  baths: string;
  setBaths: (v: string) => void;
  sqmMin: string;
  setSqmMin: (v: string) => void;
  sqmMax: string;
  setSqmMax: (v: string) => void;
  yearBuilt: string;
  setYearBuilt: (v: string) => void;
  maintenanceFee: string;
  setMaintenanceFee: (v: string) => void;
  bikeParkingSpaces: string;
  setBikeParkingSpaces: (v: string) => void;
  carParkingSpaces: string;
  setCarParkingSpaces: (v: string) => void;
  stories: string;
  setStories: (v: string) => void;
  keywords: string;
  setKeywords: (v: string) => void;
  district: string;
  setDistrict: (v: string) => void;
  onReset: () => void;
}

const FilterBar = ({
  listingType, setListingType,
  propertyType, setPropertyType,
  priceRange, setPriceRange,
  beds, setBeds,
  baths, setBaths,
  sqmMin, setSqmMin,
  sqmMax, setSqmMax,
  yearBuilt, setYearBuilt,
  maintenanceFee, setMaintenanceFee,
  bikeParkingSpaces, setBikeParkingSpaces,
  carParkingSpaces, setCarParkingSpaces,
  stories, setStories,
  keywords, setKeywords,
  district, setDistrict,
  onReset,
}: FilterBarProps) => {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filterContent = (
    <div className="space-y-4">
      {/* Price Range */}
      <div className="space-y-2">
        <Label>Price (Rs.)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={priceRange === "all" ? "" : priceRange.split("-")[0] === "0" ? "" : priceRange.split("-")[0]}
            onChange={(e) => {
              const min = e.target.value;
              const max = priceRange !== "all" ? priceRange.split("-")[1] : "";
              if (!min && !max) setPriceRange("all");
              else setPriceRange(`${min || "0"}-${max || "99999999"}`);
            }}
            className="w-full"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={priceRange === "all" ? "" : priceRange.split("-")[1] === "99999999" ? "" : priceRange.split("-")[1]}
            onChange={(e) => {
              const max = e.target.value;
              const min = priceRange !== "all" ? priceRange.split("-")[0] : "";
              if (!min && !max) setPriceRange("all");
              else setPriceRange(`${min || "0"}-${max || "99999999"}`);
            }}
            className="w-full"
          />
        </div>
      </div>

      {/* Square Meter Range */}
      <div className="space-y-2">
        <Label>Square Meter</Label>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="No Min" value={sqmMin} onChange={(e) => setSqmMin(e.target.value)} className="w-full" />
          <span className="text-muted-foreground text-sm">–</span>
          <Input type="number" placeholder="No Max" value={sqmMax} onChange={(e) => setSqmMax(e.target.value)} className="w-full" />
        </div>
      </div>

      {/* Year Built */}
      <div className="space-y-2">
        <Label>Year Built</Label>
        <Select value={yearBuilt} onValueChange={setYearBuilt}>
          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="2020">2020+</SelectItem>
            <SelectItem value="2010">2010+</SelectItem>
            <SelectItem value="2000">2000+</SelectItem>
            <SelectItem value="1990">1990+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Maintenance Fee */}
      <div className="space-y-2">
        <Label>Maintenance Fee (Rs.)</Label>
        <Select value={maintenanceFee} onValueChange={setMaintenanceFee}>
          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="0-1000">Under Rs. 1,000</SelectItem>
            <SelectItem value="0-5000">Under Rs. 5,000</SelectItem>
            <SelectItem value="0-10000">Under Rs. 10,000</SelectItem>
            <SelectItem value="0-25000">Under Rs. 25,000</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Motor Bike Parking */}
      <div className="space-y-2">
        <Label>Motor Bike Parking</Label>
        <Input type="number" min={0} placeholder="0" value={bikeParkingSpaces} onChange={(e) => setBikeParkingSpaces(e.target.value)} />
      </div>

      {/* Car Parking */}
      <div className="space-y-2">
        <Label>Car Parking</Label>
        <Input type="number" min={0} placeholder="0" value={carParkingSpaces} onChange={(e) => setCarParkingSpaces(e.target.value)} />
      </div>

      {/* Stories */}
      <div className="space-y-2">
        <Label>Stories</Label>
        <Input type="number" min={0} placeholder="0" value={stories} onChange={(e) => setStories(e.target.value)} />
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label>Keywords</Label>
        <Input type="text" placeholder="Search keywords..." value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-3 py-6">
      <Select value={listingType} onValueChange={setListingType}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Listing Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="sale">For Sale</SelectItem>
          <SelectItem value="rent">For Rent</SelectItem>
        </SelectContent>
      </Select>

      <Select value={propertyType} onValueChange={setPropertyType}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Property Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="apartment">Apartment</SelectItem>
          <SelectItem value="commercial">Commercial</SelectItem>
          <SelectItem value="house">House</SelectItem>
          <SelectItem value="land">Land</SelectItem>
        </SelectContent>
      </Select>

      <Select value={district} onValueChange={setDistrict}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="District" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Districts</SelectItem>
          {NEPAL_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={beds} onValueChange={setBeds}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Beds" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Beds</SelectItem>
          <SelectItem value="1">1+ Beds</SelectItem>
          <SelectItem value="2">2+ Beds</SelectItem>
          <SelectItem value="3">3+ Beds</SelectItem>
          <SelectItem value="4">4+ Beds</SelectItem>
        </SelectContent>
      </Select>

      <Select value={baths} onValueChange={setBaths}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Baths" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Baths</SelectItem>
          <SelectItem value="1">1+ Baths</SelectItem>
          <SelectItem value="2">2+ Baths</SelectItem>
          <SelectItem value="3">3+ Baths</SelectItem>
          <SelectItem value="4">4+ Baths</SelectItem>
        </SelectContent>
      </Select>

      {isMobile ? (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
              {filterContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4 max-h-[70vh] overflow-y-auto" align="start">
            {filterContent}
          </PopoverContent>
        </Popover>
      )}

      <Button variant="outline" size="sm" onClick={onReset}>
        Reset Filters
      </Button>
    </div>
  );
};

export default FilterBar;
