import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Bed, Bath, Maximize, Trash2, Pencil, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import PaymentHistoryList from "@/components/PaymentHistoryList";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import SimulatedPaymentForm from "@/components/SimulatedPaymentForm";
import { useFeatureFlag, FEATURE_KEYS } from "@/hooks/useFeatureFlag";
import { logPayment } from "@/lib/paymentHistory";

const MyListingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const saleFlag = useFeatureFlag(FEATURE_KEYS.PROPERTY_SALE);
  const rentFlag = useFeatureFlag(FEATURE_KEYS.PROPERTY_RENT);
  const flagFor = (listingType: string) => (listingType === "rent" ? rentFlag : saleFlag);
  const getListingFee = (listingType: string) => flagFor(listingType).fee;
  const isFreeFor = (listingType: string) => flagFor(listingType).isFree;
  const [listings, setListings] = useState<Tables<"user_properties">[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentListing, setPaymentListing] = useState<Tables<"user_properties"> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from("user_properties")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setListings(data || []);
      setLoading(false);
    };
    fetchListings();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    const { error } = await supabase.from("user_properties").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success("Listing deleted");
    }
  };

  const handlePaymentComplete = async () => {
    if (!paymentListing) return;
    const now = new Date();
    const expiration = new Date(now);
    expiration.setMonth(expiration.getMonth() + 1);

    const { error } = await supabase
      .from("user_properties")
      .update({
        status: "active" as const,
        payment_date: now.toISOString(),
        expiration_date: expiration.toISOString(),
      } as any)
      .eq("id", paymentListing.id);
    if (error) {
      toast.error("Failed to activate listing");
    } else {
      const flag = flagFor(paymentListing.listing_type);
      const isFree = flag.isFree;
      await logPayment({
        user_id: paymentListing.user_id,
        service_key: paymentListing.listing_type === "rent" ? FEATURE_KEYS.PROPERTY_RENT : FEATURE_KEYS.PROPERTY_SALE,
        service_label: paymentListing.listing_type === "rent" ? "Property Listing — For Rent" : "Property Listing — For Sale",
        related_type: "property",
        related_id: paymentListing.id,
        related_label: paymentListing.title,
        amount: isFree ? 0 : flag.fee,
        status: isFree ? "promotion" : "paid",
        promo_label: isFree ? flag.promoLabel : null,
        expiration_date: expiration.toISOString(),
      });
      setListings((prev) =>
        prev.map((l) => l.id === paymentListing.id ? { ...l, status: "active" as const, payment_date: now.toISOString(), expiration_date: expiration.toISOString() } as any : l)
      );
      toast.success("Payment successful! Your listing is now active for 1 month 🎉");
    }
    setPaymentListing(null);
  };

  const handleDeactivate = async (listing: Tables<"user_properties">) => {
    const { error } = await supabase
      .from("user_properties")
      .update({ status: "pending" as const })
      .eq("id", listing.id);
    if (error) {
      toast.error("Failed to deactivate listing");
    } else {
      setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, status: "pending" as const } : l));
      toast.success("Listing deactivated");
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-badge-new text-badge-new-foreground";
      case "pending": return "bg-yellow-500 text-foreground";
      case "sold": return "bg-muted text-muted-foreground";
      case "rented": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Listings</h1>
            <p className="text-muted-foreground mt-1">{listings.length} properties</p>
          </div>
          <Link to="/list-property">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              <Plus className="h-4 w-4" /> Add Property
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">You haven't listed any properties yet.</p>
            <Link to="/list-property">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                <Plus className="h-4 w-4" /> List Your First Property
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="flex gap-4 bg-card rounded-lg border border-border overflow-hidden shadow-card cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/property/db-${listing.id}`)}
              >
                <div className="w-48 h-36 shrink-0">
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">No Photo</div>
                  )}
                </div>
                <div className="flex-1 py-3 pr-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`border-0 capitalize ${statusColor(listing.status)}`}>{listing.status}</Badge>
                        <Badge variant="outline" className="capitalize">{listing.listing_type === "sale" ? "For Sale" : "For Rent"}</Badge>
                      </div>
                      <h3 className="font-display text-lg font-bold text-foreground">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground">{listing.address}, {listing.city}{listing.district ? `, ${listing.district}` : ''}</p>
                    </div>
                    <p className="font-display text-xl font-bold text-price">
                      Rs. {listing.price.toLocaleString()}{listing.listing_type === "rent" ? "/mo" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {listing.bedrooms} bd</span>
                    <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {listing.bathrooms} ba</span>
                    {listing.sqft && <span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> {listing.sqft.toLocaleString()} sqft</span>}
                    <div className="ml-auto flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const exp = (listing as any).expiration_date;
                        const isExpired = exp && new Date(exp) < new Date();
                        const free = isFreeFor(listing.listing_type);
                        const fee = getListingFee(listing.listing_type);
                        const promoLabel = flagFor(listing.listing_type).promoLabel;
                        const startPay = () => {
                          if (free) {
                            setPaymentListing(listing);
                            setTimeout(() => handlePaymentComplete(), 0);
                          } else {
                            setPaymentListing(listing);
                          }
                        };

                        if (isExpired) {
                          return (
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-xs">Expired {format(new Date(exp), "MMM d, yyyy")}</Badge>
                              <Button variant="default" size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={startPay}>
                                <CreditCard className="h-3.5 w-3.5" />
                                {free ? (promoLabel || "Renew Free 🎉") : `Renew Rs. ${fee.toLocaleString()}`}
                              </Button>
                            </div>
                          );
                        }
                        if (listing.status === "active" && exp) {
                          return <span className="text-xs text-muted-foreground">Active until {format(new Date(exp), "MMM d, yyyy")}</span>;
                        }
                        if (listing.status === "pending") {
                          return (
                            <Button variant="default" size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={startPay}>
                              <CreditCard className="h-3.5 w-3.5" />
                              {free ? (promoLabel || "Activate Free 🎉") : `Pay Rs. ${fee.toLocaleString()} to Activate`}
                            </Button>
                          );
                        }
                        return null;
                      })()}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(listing.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Payment Dialog */}
      <Dialog open={!!paymentListing} onOpenChange={(open) => !open && setPaymentListing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate Listing</DialogTitle>
            <DialogDescription>
              Pay the listing fee to make <strong>{paymentListing?.title}</strong> visible to buyers.
            </DialogDescription>
          </DialogHeader>
          {paymentListing && (
            <SimulatedPaymentForm
              paid={false}
              onPaymentComplete={handlePaymentComplete}
              amount={getListingFee(paymentListing.listing_type)}
              label={`Listing fee (${paymentListing.listing_type === "rent" ? "Rental" : "Sale"})`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyListingsPage;
