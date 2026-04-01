export interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  type: "house" | "condo" | "townhouse" | "apartment";
  listingType: "sale" | "rent";
  image: string;
  images: string[];
  yearBuilt: number;
  description: string;
  features: string[];
  isNew: boolean;
  agent: {
    name: string;
    phone: string;
    email: string;
  };
}
