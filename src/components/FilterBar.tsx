import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";

interface FilterBarProps {
  listingType: string;
  setListingType: (v: string) => void;
  propertyType: string;
  setPropertyType: (v: string) => void;
  priceRange: string;
  setPriceRange: (v: string) => void;
  beds: string;
  setBeds: (v: string) => void;
}

const FilterBar = ({ listingType, setListingType, propertyType, setPropertyType, priceRange, setPriceRange, beds, setBeds }: FilterBarProps) => {
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
          <SelectItem value="house">House</SelectItem>
          <SelectItem value="condo">Condo</SelectItem>
          <SelectItem value="townhouse">Townhouse</SelectItem>
          <SelectItem value="apartment">Apartment</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priceRange} onValueChange={setPriceRange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Price Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Price</SelectItem>
          <SelectItem value="0-500000">Under $500K</SelectItem>
          <SelectItem value="500000-1000000">$500K - $1M</SelectItem>
          <SelectItem value="1000000-99999999">$1M+</SelectItem>
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

      <Button variant="outline" size="sm" className="gap-2">
        <SlidersHorizontal className="h-4 w-4" /> More Filters
      </Button>
    </div>
  );
};

export default FilterBar;
