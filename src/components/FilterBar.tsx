import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

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
  sqftMin: string;
  setSqftMin: (v: string) => void;
  yearBuilt: string;
  setYearBuilt: (v: string) => void;
}

const FilterBar = ({
  listingType, setListingType,
  propertyType, setPropertyType,
  priceRange, setPriceRange,
  beds, setBeds,
  baths, setBaths,
  sqftMin, setSqftMin,
  yearBuilt, setYearBuilt,
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
        <PopoverContent className="w-72 space-y-4" align="start">
          <div className="space-y-2">
            <Label>Min. Sqft</Label>
            <Select value={sqftMin} onValueChange={setSqftMin}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="500">500+ sqft</SelectItem>
                <SelectItem value="1000">1,000+ sqft</SelectItem>
                <SelectItem value="1500">1,500+ sqft</SelectItem>
                <SelectItem value="2000">2,000+ sqft</SelectItem>
                <SelectItem value="3000">3,000+ sqft</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default FilterBar;
