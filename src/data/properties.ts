export interface Property {
  id: string;
  propertyCode?: number | null;
  title: string;
  address: string;
  city: string;
  district?: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  type: "apartment" | "commercial" | "house" | "land";
  listingType: "sale" | "rent";
  image: string;
  images: string[];
  yearBuilt: number;
  description: string;
  features: string[];
  isNew: boolean;
  maintenanceFee?: number;
  bikeParkingSpaces?: number;
  carParkingSpaces?: number;
  stories?: number;
  agent: {
    name: string;
    phone: string;
    email: string;
  };
}
