import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  onReset,
}: FilterBarProps) => {
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

      <Select value={priceRange} onValueChange={setPriceRange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Price Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Price</SelectItem>
          <SelectItem value="0-500000">Under Rs. 500K</SelectItem>
          <SelectItem value="500000-1000000">Rs. 500K - 1M</SelectItem>
          <SelectItem value="1000000-5000000">Rs. 1M - 5M</SelectItem>
          <SelectItem value="5000000-99999999">Rs. 5M+</SelectItem>
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

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-4 max-h-[70vh] overflow-y-auto" align="start">
          {/* Square Meter Range */}
          <div className="space-y-2">
            <Label>Square Meter</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="No Min"
                value={sqmMin}
                onChange={(e) => setSqmMin(e.target.value)}
                className="w-full"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="number"
                placeholder="No Max"
                value={sqmMax}
                onChange={(e) => setSqmMax(e.target.value)}
                className="w-full"
              />
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
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={bikeParkingSpaces}
              onChange={(e) => setBikeParkingSpaces(e.target.value)}
            />
          </div>

          {/* Car Parking */}
          <div className="space-y-2">
            <Label>Car Parking</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={carParkingSpaces}
              onChange={(e) => setCarParkingSpaces(e.target.value)}
            />
          </div>

          {/* Stories */}
          <div className="space-y-2">
            <Label>Stories</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={stories}
              onChange={(e) => setStories(e.target.value)}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default FilterBar;
