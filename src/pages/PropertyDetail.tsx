import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bed, Bath, Maximize, Calendar, MapPin, Heart, Share2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { properties } from "@/data/properties";

const PropertyDetail = () => {
  const { id } = useParams();
  const property = properties.find((p) => p.id === id);

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Property Not Found</h2>
            <Link to="/" className="text-accent hover:underline">Back to listings</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number, listingType: string) =>
    listingType === "rent" ? `$${price.toLocaleString()}/mo` : `$${price.toLocaleString()}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to listings
          </Link>

          <div className="rounded-lg overflow-hidden mb-8 aspect-[16/9] max-h-[500px]">
            <img src={property.image} alt={property.title} className="w-full h-full object-cover" width={1920} height={1080} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {property.isNew && <Badge className="bg-badge-new text-badge-new-foreground border-0">New</Badge>}
                      <Badge variant="secondary">For {property.listingType === "sale" ? "Sale" : "Rent"}</Badge>
                      <Badge variant="outline" className="capitalize">{property.type}</Badge>
                    </div>
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{property.title}</h1>
                    <p className="flex items-center gap-1 text-muted-foreground mt-2">
                      <MapPin className="h-4 w-4" /> {property.address}, {property.city}, {property.state} {property.zip}
                    </p>
                  </div>
                  <p className="font-display text-3xl md:text-4xl font-bold text-price">
                    {formatPrice(property.price, property.listingType)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-6 mt-6 py-4 border-y border-border">
                  <span className="flex items-center gap-2 text-foreground"><Bed className="h-5 w-5 text-muted-foreground" /> {property.beds} Bedrooms</span>
                  <span className="flex items-center gap-2 text-foreground"><Bath className="h-5 w-5 text-muted-foreground" /> {property.baths} Bathrooms</span>
                  <span className="flex items-center gap-2 text-foreground"><Maximize className="h-5 w-5 text-muted-foreground" /> {property.sqft.toLocaleString()} sqft</span>
                  <span className="flex items-center gap-2 text-foreground"><Calendar className="h-5 w-5 text-muted-foreground" /> Built {property.yearBuilt}</span>
                </div>
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-3">About this property</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-3">Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-foreground bg-secondary rounded-md px-3 py-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="gap-2"><Heart className="h-4 w-4" /> Save</Button>
                <Button variant="outline" className="gap-2"><Share2 className="h-4 w-4" /> Share</Button>
              </div>
            </div>

            <div>
              <div className="bg-card rounded-lg border border-border p-6 shadow-card sticky top-24">
                <h3 className="font-display text-lg font-bold text-foreground mb-1">Contact Agent</h3>
                <p className="text-sm text-muted-foreground mb-4">{property.agent.name}</p>
                <div className="space-y-2 mb-4 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {property.agent.phone}</p>
                  <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {property.agent.email}</p>
                </div>
                <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                  <Input placeholder="Your Name" />
                  <Input placeholder="Email" type="email" />
                  <Input placeholder="Phone" type="tel" />
                  <Textarea placeholder="I'm interested in this property..." rows={3} />
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Send Message</Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PropertyDetail;
