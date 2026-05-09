import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { SlidersHorizontal } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  NEPAL_DISTRICTS,
  NEPAL_CITIES,
  CITY_TO_DISTRICT,
  getCitiesInDistrict,
} from '@/data/nepalLocations';
import SearchableCombobox from '@/components/SearchableCombobox';

interface FilterBarProps {
  listingType: string;
  setListingType: (v: string) => void;
  propertyType: string;
  setPropertyType: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
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
  availableCities?: string[];
}

const FilterBar = ({
  listingType,
  setListingType,
  propertyType,
  setPropertyType,
  city,
  setCity,
  priceRange,
  setPriceRange,
  beds,
  setBeds,
  baths,
  setBaths,
  sqmMin,
  setSqmMin,
  sqmMax,
  setSqmMax,
  yearBuilt,
  setYearBuilt,
  maintenanceFee,
  setMaintenanceFee,
  bikeParkingSpaces,
  setBikeParkingSpaces,
  carParkingSpaces,
  setCarParkingSpaces,
  stories,
  setStories,
  keywords,
  setKeywords,
  district,
  setDistrict,
  onReset,
  availableCities = [],
}: FilterBarProps) => {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Helper to treat '0' as empty string for display and select all on focus
  const numericInputProps = (value: string, setter: (v: string) => void) => ({
    value: value === '0' ? '' : value,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Remove leading zeros
      if (val.length > 1 && val.startsWith('0')) {
        setter(val.replace(/^0+/, ''));
      } else {
        setter(val || '0');
      }
    },
  });

  const filterContent = (
    <div className='space-y-4'>
      {/* Price Range */}
      <div className='space-y-2'>
        <Label>Price (Rs.)</Label>
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            placeholder='Min'
            onFocus={e => e.target.select()}
            value={
              priceRange === 'all'
                ? ''
                : priceRange.split('-')[0] === '0'
                  ? ''
                  : priceRange.split('-')[0]
            }
            onChange={e => {
              const val = e.target.value.replace(/^0+/, '') || '0';
              const max =
                priceRange !== 'all' ? priceRange.split('-')[1] : '99999999';
              setPriceRange(`${val}-${max}`);
            }}
            className='w-full focus-visible:ring-[#FF6B00]'
          />
          <span className='text-muted-foreground text-sm'>–</span>
          <Input
            type='number'
            placeholder='Max'
            onFocus={e => e.target.select()}
            value={
              priceRange === 'all'
                ? ''
                : priceRange.split('-')[1] === '99999999'
                  ? ''
                  : priceRange.split('-')[1]
            }
            onChange={e => {
              const val = e.target.value.replace(/^0+/, '') || '99999999';
              const min = priceRange !== 'all' ? priceRange.split('-')[0] : '0';
              setPriceRange(`${min}-${val}`);
            }}
            className='w-full focus-visible:ring-[#FF6B00]'
          />
        </div>
      </div>

      {/* Square Meter Range */}
      <div className='space-y-2'>
        <Label>Square Meter</Label>
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            placeholder='No Min'
            {...numericInputProps(sqmMin, setSqmMin)}
            className='w-full focus-visible:ring-[#FF6B00]'
          />
          <span className='text-muted-foreground text-sm'>–</span>
          <Input
            type='number'
            placeholder='No Max'
            {...numericInputProps(sqmMax, setSqmMax)}
            className='w-full focus-visible:ring-[#FF6B00]'
          />
        </div>
      </div>

      {/* Year Built */}
      <div className='space-y-2'>
        <Label>Year Built</Label>
        <Select value={yearBuilt} onValueChange={setYearBuilt}>
          <SelectTrigger className='focus:ring-[#FF6B00]'>
            <SelectValue placeholder='Any' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Any</SelectItem>
            <SelectItem value='2020'>2020+</SelectItem>
            <SelectItem value='2010'>2010+</SelectItem>
            <SelectItem value='2000'>2000+</SelectItem>
            <SelectItem value='1990'>1990+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Maintenance Fee */}
      <div className='space-y-2'>
        <Label>Maintenance Fee (Rs.)</Label>
        <Select value={maintenanceFee} onValueChange={setMaintenanceFee}>
          <SelectTrigger className='focus:ring-[#FF6B00]'>
            <SelectValue placeholder='Any' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Any</SelectItem>
            <SelectItem value='0-1000'>Under Rs. 1,000</SelectItem>
            <SelectItem value='0-5000'>Under Rs. 5,000</SelectItem>
            <SelectItem value='0-10000'>Under Rs. 10,000</SelectItem>
            <SelectItem value='0-25000'>Under Rs. 25,000</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Motor Bike Parking */}
      <div className='space-y-2'>
        <Label>Motor Bike Parking</Label>
        <Input
          type='number'
          min={0}
          placeholder='0'
          {...numericInputProps(bikeParkingSpaces, setBikeParkingSpaces)}
          className='focus-visible:ring-[#FF6B00]'
        />
      </div>

      {/* Car Parking */}
      <div className='space-y-2'>
        <Label>Car Parking</Label>
        <Input
          type='number'
          min={0}
          placeholder='0'
          {...numericInputProps(carParkingSpaces, setCarParkingSpaces)}
          className='focus-visible:ring-[#FF6B00]'
        />
      </div>

      {/* Stories */}
      <div className='space-y-2'>
        <Label>Stories</Label>
        <Input
          type='number'
          min={0}
          placeholder='0'
          {...numericInputProps(stories, setStories)}
          className='focus-visible:ring-[#FF6B00]'
        />
      </div>

      {/* Keywords */}
      <div className='space-y-2'>
        <Label>Keywords</Label>
        <Input
          type='text'
          placeholder='Search keywords...'
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          className='focus-visible:ring-[#FF6B00]'
        />
      </div>
    </div>
  );

  return (
    <div className='flex flex-wrap items-center gap-3 py-6'>
      <Select value={listingType} onValueChange={setListingType}>
        <SelectTrigger className='w-[130px] focus:ring-[#FF6B00]'>
          <SelectValue placeholder='Listing Type' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All</SelectItem>
          <SelectItem value='sale'>For Sale</SelectItem>
          <SelectItem value='rent'>For Rent</SelectItem>
        </SelectContent>
      </Select>

      <Select value={propertyType} onValueChange={setPropertyType}>
        <SelectTrigger className='w-[150px] focus:ring-[#FF6B00]'>
          <SelectValue placeholder='Property Type' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Types</SelectItem>
          <SelectItem value='apartment'>Apartment</SelectItem>
          <SelectItem value='commercial'>Commercial</SelectItem>
          <SelectItem value='house'>House</SelectItem>
          <SelectItem value='land'>Land</SelectItem>
        </SelectContent>
      </Select>

      <SearchableCombobox
        value={city}
        onValueChange={val => {
          setCity(val);
          if (val !== 'all' && CITY_TO_DISTRICT[val]) {
            setDistrict(CITY_TO_DISTRICT[val]);
          }
        }}
        options={
          district !== 'all'
            ? getCitiesInDistrict(district)
            : [...new Set([...NEPAL_CITIES, ...availableCities])].sort()
        }
        placeholder='City'
        searchPlaceholder='Search cities...'
        allLabel='All Cities'
        showAllOption
        className='w-[150px]'
      />

      <SearchableCombobox
        value={district}
        onValueChange={val => {
          setDistrict(val);
          setCity('all');
        }}
        options={NEPAL_DISTRICTS}
        placeholder='District'
        searchPlaceholder='Search districts...'
        allLabel='All Districts'
        showAllOption
        className='w-[150px]'
      />

      <Select value={beds} onValueChange={setBeds}>
        <SelectTrigger className='w-[120px] focus:ring-[#FF6B00]'>
          <SelectValue placeholder='Beds' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Any Beds</SelectItem>
          <SelectItem value='1'>1+ Beds</SelectItem>
          <SelectItem value='2'>2+ Beds</SelectItem>
          <SelectItem value='3'>3+ Beds</SelectItem>
          <SelectItem value='4'>4+ Beds</SelectItem>
        </SelectContent>
      </Select>

      <Select value={baths} onValueChange={setBaths}>
        <SelectTrigger className='w-[120px] focus:ring-[#FF6B00]'>
          <SelectValue placeholder='Baths' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Any Baths</SelectItem>
          <SelectItem value='1'>1+ Baths</SelectItem>
          <SelectItem value='2'>2+ Baths</SelectItem>
          <SelectItem value='3'>3+ Baths</SelectItem>
          <SelectItem value='4'>4+ Baths</SelectItem>
        </SelectContent>
      </Select>

      {isMobile ? (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='gap-2 hover:border-[#FF6B00]'
            >
              <SlidersHorizontal className='h-4 w-4' /> Filters
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className='px-4 pb-6 max-h-[70vh] overflow-y-auto'>
              {filterContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='gap-2 hover:border-[#FF6B00]'
            >
              <SlidersHorizontal className='h-4 w-4' /> Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-80 space-y-4 max-h-[70vh] overflow-y-auto'
            align='start'
          >
            {filterContent}
          </PopoverContent>
        </Popover>
      )}

      <div className='w-full pt-1'>
        <Button
          variant='outline'
          size='sm'
          onClick={onReset}
          className='hover:border-[#FF6B00] hover:text-[#FF6B00]'
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;
