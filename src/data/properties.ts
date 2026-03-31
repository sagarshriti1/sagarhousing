import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import property4 from "@/assets/property-4.jpg";
import property5 from "@/assets/property-5.jpg";
import property6 from "@/assets/property-6.jpg";

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

export const properties: Property[] = [
  {
    id: "1",
    title: "Modern Contemporary Home",
    address: "1234 Oakwood Drive",
    city: "Austin",
    state: "TX",
    zip: "78701",
    price: 875000,
    beds: 4,
    baths: 3,
    sqft: 3200,
    type: "house",
    listingType: "sale",
    image: property1,
    images: [property1],
    yearBuilt: 2022,
    description: "Stunning modern home featuring an open floor plan, gourmet kitchen with quartz countertops, and a spacious master suite. Floor-to-ceiling windows flood the home with natural light. The backyard oasis includes a covered patio perfect for entertaining.",
    features: ["Smart Home", "Hardwood Floors", "Quartz Countertops", "Walk-in Closets", "2-Car Garage", "Central AC"],
    isNew: true,
    agent: { name: "Sarah Mitchell", phone: "(512) 555-0123", email: "sarah@realty.com" },
  },
  {
    id: "2",
    title: "Charming Craftsman Bungalow",
    address: "567 Maple Street",
    city: "Nashville",
    state: "TN",
    zip: "37201",
    price: 425000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    type: "house",
    listingType: "sale",
    image: property2,
    images: [property2],
    yearBuilt: 1925,
    description: "Beautiful craftsman bungalow with original hardwood floors, built-in shelving, and a wrap-around porch. Updated kitchen and bathrooms while maintaining historic charm. Located in a walkable neighborhood close to shops and restaurants.",
    features: ["Original Hardwood", "Wrap-around Porch", "Updated Kitchen", "Fenced Yard", "Historic District"],
    isNew: false,
    agent: { name: "James Cooper", phone: "(615) 555-0456", email: "james@realty.com" },
  },
  {
    id: "3",
    title: "Luxury Downtown Condo",
    address: "890 Skyline Blvd, Unit 1502",
    city: "Chicago",
    state: "IL",
    zip: "60601",
    price: 1250000,
    beds: 2,
    baths: 2,
    sqft: 1500,
    type: "condo",
    listingType: "sale",
    image: property3,
    images: [property3],
    yearBuilt: 2020,
    description: "Sleek luxury condo with panoramic city views from the 15th floor. Features include a chef's kitchen, floor-to-ceiling windows, private balcony, and access to building amenities including a rooftop pool, fitness center, and 24/7 concierge.",
    features: ["City Views", "Concierge", "Rooftop Pool", "Fitness Center", "Parking Included", "Balcony"],
    isNew: true,
    agent: { name: "Emily Chen", phone: "(312) 555-0789", email: "emily@realty.com" },
  },
  {
    id: "4",
    title: "Historic Brick Townhouse",
    address: "234 Heritage Row",
    city: "Philadelphia",
    state: "PA",
    zip: "19103",
    price: 3200,
    beds: 3,
    baths: 2.5,
    sqft: 2100,
    type: "townhouse",
    listingType: "rent",
    image: property4,
    images: [property4],
    yearBuilt: 1890,
    description: "Beautifully restored historic townhouse with exposed brick walls, original moldings, and modern updates throughout. Three spacious bedrooms, a private rear garden, and a finished basement. Steps from public transit and Center City.",
    features: ["Exposed Brick", "Private Garden", "Finished Basement", "In-unit Laundry", "Pet Friendly"],
    isNew: false,
    agent: { name: "Michael Torres", phone: "(215) 555-0321", email: "michael@realty.com" },
  },
  {
    id: "5",
    title: "Spacious Ranch Home",
    address: "789 Meadow Lane",
    city: "Denver",
    state: "CO",
    zip: "80201",
    price: 550000,
    beds: 4,
    baths: 2,
    sqft: 2400,
    type: "house",
    listingType: "sale",
    image: property5,
    images: [property5],
    yearBuilt: 2005,
    description: "Well-maintained ranch home on a generous lot with mountain views. Open layout, updated kitchen with granite counters, and a large family room. The finished basement adds extra living space. Attached 2-car garage and mature landscaping.",
    features: ["Mountain Views", "Granite Counters", "Finished Basement", "2-Car Garage", "Large Lot"],
    isNew: false,
    agent: { name: "Lisa Johnson", phone: "(303) 555-0654", email: "lisa@realty.com" },
  },
  {
    id: "6",
    title: "Mediterranean Villa Estate",
    address: "1001 Palm Vista Court",
    city: "Scottsdale",
    state: "AZ",
    zip: "85251",
    price: 2100000,
    beds: 5,
    baths: 4.5,
    sqft: 5200,
    type: "house",
    listingType: "sale",
    image: property6,
    images: [property6],
    yearBuilt: 2018,
    description: "Breathtaking Mediterranean-style estate with resort-like amenities. Features include a gourmet kitchen, home theater, wine cellar, and a luxurious master suite with spa-like bath. The outdoor area boasts a pool, spa, outdoor kitchen, and lush tropical landscaping.",
    features: ["Pool & Spa", "Home Theater", "Wine Cellar", "Outdoor Kitchen", "Smart Home", "3-Car Garage"],
    isNew: true,
    agent: { name: "David Park", phone: "(480) 555-0987", email: "david@realty.com" },
  },
];
