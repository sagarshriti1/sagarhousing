import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Bed, Bath, Maximize, Trash2, Pencil, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const MyListingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Tables<"user_properties">[]>([]);
  const [loading, setLoading] = useState(true);

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

  const toggleStatus = async (listing: Tables<"user_properties">) => {
    const newStatus = listing.status === "active" ? "pending" : "active";
    // Payment bypass — in future, verify $1000 payment before activating
    // if (newStatus === "active") { await verifyPayment(); }
    const { error } = await supabase
      .from("user_properties")
      .update({ status: newStatus })
      .eq("id", listing.id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, status: newStatus } : l));
      toast.success(newStatus === "active" ? "Listing activated!" : "Listing deactivated");
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
              <div key={listing.id} className="flex gap-4 bg-card rounded-lg border border-border overflow-hidden shadow-card">
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
                      <p className="text-sm text-muted-foreground">{listing.address}, {listing.city}, {listing.state} {listing.zip_code}</p>
                    </div>
                    <p className="font-display text-xl font-bold text-price">
                      ${listing.price.toLocaleString()}{listing.listing_type === "rent" ? "/mo" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {listing.bedrooms} bd</span>
                    <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {listing.bathrooms} ba</span>
                    {listing.sqft && <span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> {listing.sqft.toLocaleString()} sqft</span>}
                    <div className="ml-auto flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{listing.status === "active" ? "Active" : "Inactive"}</span>
                        <Switch
                          checked={listing.status === "active"}
                          onCheckedChange={() => toggleStatus(listing)}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>$1,000</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free beta</Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/edit-property/${listing.id}`)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(listing.id)}>
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
    </div>
  );
};

export default MyListingsPage;
