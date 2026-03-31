import { Link } from "react-router-dom";
import { Heart, Bed, Bath, Maximize } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@/data/properties";

interface PropertyCardProps {
  property: Property;
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  const formatPrice = (price: number, listingType: string) => {
    if (listingType === "rent") {
      return `$${price.toLocaleString()}/mo`;
    }
    return `$${price.toLocaleString()}`;
  };

  return (
    <Link
      to={`/property/${property.id}`}
      className="group block bg-card rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          width={800}
          height={600}
        />
        <button
          onClick={(e) => { e.preventDefault(); }}
          className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
        >
          <Heart className="h-4 w-4 text-muted-foreground hover:text-accent" />
        </button>
        {property.isNew && (
          <Badge className="absolute top-3 left-3 bg-badge-new text-badge-new-foreground border-0">
            New
          </Badge>
        )}
        <Badge variant="secondary" className="absolute bottom-3 left-3 border-0 bg-card/90 backdrop-blur-sm text-foreground">
          For {property.listingType === "sale" ? "Sale" : "Rent"}
        </Badge>
      </div>

      <div className="p-4">
        <p className="font-display text-2xl font-bold text-price mb-1">
          {formatPrice(property.price, property.listingType)}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {property.beds} bd</span>
          <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {property.baths} ba</span>
          <span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> {property.sqft.toLocaleString()} sqft</span>
        </div>
        <p className="text-sm text-foreground font-medium truncate">{property.address}</p>
        <p className="text-sm text-muted-foreground">{property.city}, {property.state} {property.zip}</p>
      </div>
    </Link>
  );
};

export default PropertyCard;
