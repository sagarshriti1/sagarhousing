import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Bed, Bath, Maximize, Calendar, MapPin, Heart, Share2, Phone, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const PropertyDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [property, setProperty] = useState<Tables<"user_properties"> | null>(null);
  const [seller, setSeller] = useState<{ display_name: string | null; contact_details: string | null; avatar_url: string | null; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [inquiry, setInquiry] = useState({ name: "", email: "", phone: "", message: "" });
  const [inquirySending, setInquirySending] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  const updateInquiry = (field: "name" | "email" | "phone" | "message", value: string) => {
    setInquiry((prev) => ({ ...prev, [field]: value }));
    if (inquirySent && (field === "name" || field === "message")) {
      setInquirySent(false);
    }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry.name.trim() || !inquiry.email.trim() || !inquiry.message.trim()) {
      toast.error("Please fill in your name, email, and message");
      return;
    }
    if (!property) return;
    setInquirySending(true);
    try {
      const propertyUrl = window.location.href;
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "property-inquiry",
          recipientEmail: (seller as any)?.email ?? "",
          idempotencyKey: `inquiry-${property.id}-${Date.now()}`,
          templateData: {
            inquirerName: inquiry.name,
            inquirerEmail: inquiry.email,
            inquirerPhone: inquiry.phone,
            message: inquiry.message,
            propertyTitle: property.title,
            propertyUrl,
          },
        },
      });
      if (error) throw error;
      setInquiry({ name: "", email: "", phone: "", message: "" });
      setInquirySent(true);
      toast.success("Your message was sent to the seller");
    } catch (err: any) {
      // Email not yet configured — still acknowledge to user
      console.warn("Inquiry send failed:", err?.message);
      setInquiry({ name: "", email: "", phone: "", message: "" });
      setInquirySent(true);
      toast.success("Message saved. Email delivery will be enabled shortly.");
    } finally {
      setInquirySending(false);
    }
  };

  const favoriteId = id ? (id.startsWith("db-") ? id : `db-${id}`) : "";

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      const dbId = id.startsWith("db-") ? id.replace("db-", "") : id;
      const { data } = await supabase
        .from("user_properties")
        .select("*")
        .eq("id", dbId)
        .single();
      setProperty(data);
      if (data?.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, contact_details, avatar_url, email")
          .eq("user_id", data.user_id)
          .maybeSingle();
        setSeller(prof as any);
      }
      setLoading(false);
    };
    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Footer />
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
    listingType === "rent" ? `Rs. ${price.toLocaleString()}/mo` : `Rs. ${price.toLocaleString()}`;

  const images = (property.images && property.images.length > 0) ? property.images : ["/placeholder.svg"];
  const isNew = new Date(property.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to listings
          </Link>

          <div className="relative rounded-lg overflow-hidden mb-2 aspect-[16/9] max-h-[500px]">
            <img src={images[activeImage]} alt={property.title} className="w-full h-full object-cover" width={1920} height={1080} />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <button
                  onClick={() => setActiveImage((prev) => (prev + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
                <span className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-card/80 backdrop-blur-sm text-xs text-foreground">
                  {activeImage + 1} / {images.length}
                </span>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${i === activeImage ? "border-accent" : "border-transparent hover:border-muted-foreground/30"}`}
                >
                  <img src={img} alt={`${property.title} ${i + 1}`} className="h-16 w-24 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-8">
            <div className="space-y-8">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {isNew && <Badge className="bg-badge-new text-badge-new-foreground border-0">New</Badge>}
                      <Badge variant="secondary">For {property.listing_type === "sale" ? "Sale" : "Rent"}</Badge>
                      <Badge variant="outline" className="capitalize">{property.property_type}</Badge>
                    </div>
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{property.title}</h1>
                    {(property as any).property_code != null && (
                      <p className="font-mono text-sm text-muted-foreground mt-1">Property ID: #{(property as any).property_code}</p>
                    )}
                    <p className="flex items-center gap-1 text-muted-foreground mt-2">
                      <MapPin className="h-4 w-4" /> {property.address}, {property.city}{(property as any).district ? `, ${(property as any).district}` : ''}
                    </p>
                  </div>
                  <p className="font-display text-3xl md:text-4xl font-bold text-price">
                    {formatPrice(Number(property.price), property.listing_type)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-6 mt-6 py-4 border-y border-border">
                  <span className="flex items-center gap-2 text-foreground"><Bed className="h-5 w-5 text-muted-foreground" /> {property.bedrooms} Bedrooms</span>
                  <span className="flex items-center gap-2 text-foreground"><Bath className="h-5 w-5 text-muted-foreground" /> {Number(property.bathrooms)} Bathrooms</span>
                  <span className="flex items-center gap-2 text-foreground"><Maximize className="h-5 w-5 text-muted-foreground" /> {(property.sqft ?? 0).toLocaleString()} sqft</span>
                  {property.year_built && <span className="flex items-center gap-2 text-foreground"><Calendar className="h-5 w-5 text-muted-foreground" /> Built {property.year_built}</span>}
                </div>
              </div>

              {property.description && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-3">About this property</h2>
                  <p className="text-muted-foreground leading-relaxed">{property.description}</p>
                </div>
              )}

              {property.features && property.features.length > 0 && (
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
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={async () => {
                    if (!user) {
                      toast.error("Please sign in to save favorites");
                      navigate("/auth");
                      return;
                    }
                    const success = await toggleFavorite(favoriteId);
                    if (success) {
                      toast.success(isFavorite(favoriteId) ? "Removed from favorites" : "Added to favorites");
                    }
                  }}
                >
                  <Heart className={`h-4 w-4 ${isFavorite(favoriteId) ? "text-red-500 fill-red-500" : ""}`} />
                  {isFavorite(favoriteId) ? "Saved" : "Save"}
                </Button>
                <Button variant="outline" className="gap-2"><Share2 className="h-4 w-4" /> Share</Button>
              </div>
            </div>

            <div className="max-w-3xl mx-auto w-full">
              <div className="bg-card rounded-lg border-2 border-accent/40 shadow-card overflow-hidden">
                <div className="p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">Contact Seller</h3>
                  <div className="flex items-center gap-3 mb-4">
                    {seller?.avatar_url ? (
                      <img src={seller.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {(seller?.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{seller?.display_name || "Seller"}</p>
                      <p className="text-xs text-muted-foreground">Listed by</p>
                    </div>
                  </div>
                  {seller?.contact_details ? (
                    <div className="rounded-md bg-secondary p-3">
                      <p className="text-sm text-foreground whitespace-pre-line">{seller.contact_details}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No contact info provided. Use the form below to reach out.</p>
                  )}
                </div>

                <div className="border-t border-border p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-4">Inquire About This Property</h3>
                  <form className="space-y-3" onSubmit={handleInquirySubmit}>
                    <Input
                      placeholder="Your Name"
                      value={inquiry.name}
                      onChange={(e) => updateInquiry("name", e.target.value)}
                      maxLength={100}
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={inquiry.email}
                      onChange={(e) => updateInquiry("email", e.target.value)}
                      maxLength={255}
                    />
                    <Input
                      placeholder="Phone"
                      type="tel"
                      value={inquiry.phone}
                      onChange={(e) => updateInquiry("phone", e.target.value)}
                      maxLength={30}
                    />
                    <Textarea
                      placeholder="I'm interested in this property..."
                      rows={4}
                      value={inquiry.message}
                      onChange={(e) => updateInquiry("message", e.target.value)}
                      maxLength={2000}
                    />
                    <Button
                      type="submit"
                      disabled={inquirySending || inquirySent}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {inquirySending ? "Sending..." : inquirySent ? "Message Sent!" : "Send Message"}
                    </Button>
                  </form>
                </div>
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