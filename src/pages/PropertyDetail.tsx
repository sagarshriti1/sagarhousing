import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bed, Bath, Maximize, Calendar, MapPin, Heart, Share2, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      setLoading(true);
      const cleanId = id.startsWith('db-') ? id.replace('db-', '') : id;
      const { data } = await supabase
        .from('user_properties')
        .select('*, profiles(display_name, phone, email, avatar_url)')
        .eq('id', cleanId)
        .maybeSingle();

      if (data) setProperty(data);
      setLoading(false);
    };
    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

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
    `Rs. ${price.toLocaleString()}${listingType === "rent" ? "/mo" : ""}`;

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/placeholder.svg";
    if (imagePath.startsWith('http')) return imagePath;
    return supabase.storage.from('property-images').getPublicUrl(imagePath).data.publicUrl;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-6 max-w-5xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to listings
          </Link>

          <div className="rounded-lg overflow-hidden mb-8 aspect-[16/9] max-h-[500px] bg-muted">
            <img 
              src={getImageUrl(property.images?.[0])} 
              alt={property.title} 
              className="w-full h-full object-cover" 
            />
          </div>

          <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">For {property.listing_type === "sale" ? "Sale" : "Rent"}</Badge>
                  <Badge variant="outline" className="capitalize">{property.property_type}</Badge>
                  {property.property_code && (
                    <span className="text-xs font-mono text-muted-foreground ml-2">Property ID: {property.property_code}</span>
                  )}
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{property.title}</h1>
                <p className="flex items-center gap-1 text-muted-foreground mt-2">
                  <MapPin className="h-4 w-4" /> {property.address}, {property.city}
                </p>
              </div>
              <p className="font-display text-3xl md:text-4xl font-bold text-primary">
                {formatPrice(property.price, property.listing_type)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 py-4 border-y border-border">
              <span className="flex items-center gap-2 text-foreground"><Bed className="h-5 w-5 text-muted-foreground" /> {property.bedrooms} Bedrooms</span>
              <span className="flex items-center gap-2 text-foreground"><Bath className="h-5 w-5 text-muted-foreground" /> {Number(property.bathrooms)} Bathrooms</span>
              <span className="flex items-center gap-2 text-foreground"><Maximize className="h-5 w-5 text-muted-foreground" /> {property.sqft?.toLocaleString()} sqft</span>
              <span className="flex items-center gap-2 text-foreground"><Calendar className="h-5 w-5 text-muted-foreground" /> Built {property.year_built || 'N/A'}</span>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">About this property</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>

            {property.features && property.features.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-3">Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {property.features.map((f: string) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-foreground bg-secondary rounded-md px-3 py-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2"><Heart className="h-4 w-4" /> Save</Button>
              <Button variant="outline" className="gap-2"><Share2 className="h-4 w-4" /> Share</Button>
            </div>

            {/* Contact Seller Section at the bottom */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-card max-w-2xl mx-auto mt-12">
              <h3 className="font-display text-xl font-bold text-foreground mb-4 text-center">Contact Seller</h3>
              <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white font-bold">
                  {property.profiles?.avatar_url ? (
                    <img src={property.profiles.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    property.profiles?.display_name?.[0] || "A"
                  )}
                </div>
                <div>
                  <p className="font-bold text-foreground">{property.profiles?.display_name || "Agent"}</p>
                  <p className="text-xs text-muted-foreground">Listing Agent</p>
                  {property.profiles?.phone && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {property.profiles.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-display font-semibold text-center mb-2">Inquire About This Property</h4>
                <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                  <Input placeholder="Your Name" />
                  <Input placeholder="Email" type="email" />
                  <Input placeholder="Phone" type="tel" />
                  <Textarea placeholder="I'm interested in this property..." rows={3} />
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg font-bold">Send Message</Button>
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
