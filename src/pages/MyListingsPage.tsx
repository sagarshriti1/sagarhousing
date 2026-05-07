import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Bed, Bath, Maximize, Trash2, CreditCard, Pencil, Receipt, Search } from "lucide-react";
import PaymentHistoryList from "@/components/PaymentHistoryList";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import SimulatedPaymentForm from "@/components/SimulatedPaymentForm";
import { useFeatureFlag, FEATURE_KEYS } from "@/hooks/useFeatureFlag";
import { logPayment } from "@/lib/paymentHistory";

const MyListingsPage = () => {
  const { user, role } = useAuth();
  const FREE_USER_LISTING_LIMIT = 2;
  const isRealtor = role === 'realtor';
  const isStandardUser = !!user && !isRealtor && role !== 'admin';
  const [realtorInactive, setRealtorInactive] = useState(false);
  const navigate = useNavigate();
  const saleFlag = useFeatureFlag(FEATURE_KEYS.PROPERTY_SALE);
  const rentFlag = useFeatureFlag(FEATURE_KEYS.PROPERTY_RENT);
  const flagFor = (listingType: string) => (listingType === "rent" ? rentFlag : saleFlag);
  const getListingFee = (listingType: string) => flagFor(listingType).fee;
  const isFreeFor = (listingType: string) => flagFor(listingType).isFree;
  const [listings, setListings] = useState<Tables<"user_properties">[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentListing, setPaymentListing] = useState<Tables<"user_properties"> | null>(null);
  const [paymentsListing, setPaymentsListing] = useState<Tables<"user_properties"> | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [blockedDeleteOpen, setBlockedDeleteOpen] = useState(false);


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

  useEffect(() => {
    if (!user || !isRealtor) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('realtors')
        .select('payment_status, expiration_date')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const active = !!data
        && (data.payment_status === 'paid' || data.payment_status === 'promotion' || data.payment_status === 'bypassed')
        && (!data.expiration_date || new Date(data.expiration_date) > new Date());
      setRealtorInactive(!active);
    })();
    return () => { cancelled = true; };
  }, [user, isRealtor]);

  const handleDelete = (id: string) => {
    const listing = listings.find((l) => l.id === id);
    if (listing?.status === "active") {
      toast.error("Active listings cannot be deleted. Please change the status to Inactive before deleting.");
      return;
    }
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
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

  const handleReactivate = async (listing: Tables<"user_properties">) => {
    const { error } = await supabase
      .from("user_properties")
      .update({ status: "active" as const })
      .eq("id", listing.id);
    if (error) {
      toast.error("Failed to reactivate listing");
    } else {
      setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, status: "active" as const } : l));
      toast.success("Listing reactivated");
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
        {(() => {
          const atLimit = isStandardUser && listings.length >= FREE_USER_LISTING_LIMIT;
          const blockRealtor = isRealtor && realtorInactive;
          const disableAdd = atLimit || blockRealtor;
          const disableTitle = blockRealtor
            ? "Your Realtor profile is inactive or expired. Renew your subscription from the Realtor Dashboard before posting new listings."
            : `You've reached the ${FREE_USER_LISTING_LIMIT}-listing limit. Delete an existing listing or upgrade to a Realtor account.`;
          return (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground">My Listings</h1>
                  <p className="text-muted-foreground mt-1">
                    {listings.length} properties
                    {isStandardUser && ` · Standard accounts can post up to ${FREE_USER_LISTING_LIMIT} listings (${listings.length}/${FREE_USER_LISTING_LIMIT} used)`}
                  </p>
                </div>
                {disableAdd ? (
                  <Button
                    className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                    disabled
                    title={disableTitle}
                  >
                    <Plus className="h-4 w-4" /> Add Property
                  </Button>
                ) : (
                  <Link to="/list-property">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                      <Plus className="h-4 w-4" /> Add Property
                    </Button>
                  </Link>
                )}
              </div>
              {blockRealtor && (
                <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
                  Your Realtor profile is inactive or expired. Please renew your Realtor subscription from the{' '}
                  <Link to="/realtor-dashboard" className="underline font-medium">Realtor Dashboard</Link> before posting new listings.
                </div>
              )}
            </>
          );
        })()}

        {!loading && listings.length > 0 && (
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, title, address, city…"
              className="pl-9"
            />
          </div>
        )}

        {(() => {
          const q = search.trim().toLowerCase().replace(/^#/, "");
          const filtered = q
            ? listings.filter((l) => {
                const code = String((l as any).property_code ?? "");
                return (
                  code.includes(q) ||
                  l.title.toLowerCase().includes(q) ||
                  (l.address || "").toLowerCase().includes(q) ||
                  (l.city || "").toLowerCase().includes(q) ||
                  (l.district || "").toLowerCase().includes(q)
                );
              })
            : listings;

          if (loading) return <div className="text-center py-16 text-muted-foreground">Loading...</div>;
          if (listings.length === 0) return (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">You haven't listed any properties yet.</p>
              <Link to="/list-property">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                  <Plus className="h-4 w-4" /> List Your First Property
                </Button>
              </Link>
            </div>
          );
          if (filtered.length === 0) return (
            <div className="text-center py-16 text-muted-foreground">No matches for "{search}"</div>
          );
          return (
          <div className="space-y-4">
            {filtered.map((listing) => (
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
                        {(listing as any).property_code != null && (
                          <span className="font-mono text-xs text-muted-foreground">#{(listing as any).property_code}</span>
                        )}
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
                          const withinActivePeriod = exp && new Date(exp) > new Date();
                          if (withinActivePeriod) {
                            return (
                              <Button variant="default" size="sm" className="gap-1.5" onClick={() => handleReactivate(listing)}>
                                Reactivate
                              </Button>
                            );
                          }
                          return (
                            <Button variant="default" size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={startPay}>
                              <CreditCard className="h-3.5 w-3.5" />
                              {free ? (promoLabel || "Activate Free 🎉") : `Pay Rs. ${fee.toLocaleString()} to Activate`}
                            </Button>
                          );
                        }
                        return null;
                      })()}
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit listing" onClick={(e) => { e.stopPropagation(); navigate(`/edit-property/${listing.id}`); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View payments" onClick={(e) => { e.stopPropagation(); setPaymentsListing(listing); }}>
                        <Receipt className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(listing.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          );
        })()}
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
      {/* Payment History Dialog */}
      <Dialog open={!!paymentsListing} onOpenChange={(open) => !open && setPaymentsListing(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              Payments for <strong>{paymentsListing?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          {paymentsListing && (
            <PaymentHistoryList relatedType="property" relatedId={paymentsListing.id} compact />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this listing. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyListingsPage;
