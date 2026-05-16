import React from 'react';
import { Label } from '@/components/ui/label';
import SearchableCombobox from '@/components/SearchableCombobox';
import { NEPAL_CITIES, NEPAL_DISTRICTS, getDistrictForCity } from '@/data/nepalLocations';

interface LocationSelectorProps {
  city: string;
  district: string;
  onLocationChange: (city: string, district: string) => void;
  cityLabel?: string;
  districtLabel?: string;
  className?: string;
  error?: string;
  showLabels?: boolean;
  showAllOption?: boolean;
  allLabel?: string;
}

const LocationSelector = ({
  city,
  district,
  onLocationChange,
  cityLabel = 'City',
  districtLabel = 'District *',
  className = '',
  error,
  showLabels = true,
  showAllOption = false,
  allLabel = 'All',
}: LocationSelectorProps) => {
  const handleCityChange = (newCity: string) => {
    // Rule 3: Selecting City corresponds to its district
    const newDistrict = getDistrictForCity(newCity) || district;
    onLocationChange(newCity, newDistrict);
  };

  const handleDistrictChange = (newDistrict: string) => {
    // Rule 4: If user change the selected district, the city field should reset
    onLocationChange('', newDistrict);
  };

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div className='space-y-2'>
        {showLabels && <Label>{cityLabel}</Label>}
        <SearchableCombobox
          value={city}
          onValueChange={handleCityChange}
          options={NEPAL_CITIES}
          placeholder='Select City'
          searchPlaceholder='Search cities...'
          allLabel={allLabel}
          showAllOption={showAllOption}
          className='w-full'
        />
      </div>
      <div className='space-y-2'>
        {showLabels && <Label>{districtLabel}</Label>}
        <SearchableCombobox
          value={district}
          onValueChange={handleDistrictChange}
          options={NEPAL_DISTRICTS}
          placeholder='Select District'
          searchPlaceholder='Search districts...'
          allLabel={allLabel}
          showAllOption={showAllOption}
          className='w-full'
        />
        {error && (
          <p className='text-xs text-destructive mt-1'>{error}</p>
        )}
      </div>
    </div>
  );
};

export default LocationSelector;
