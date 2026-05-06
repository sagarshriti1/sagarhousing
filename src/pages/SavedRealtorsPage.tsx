import { useState, useEffect } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSavedRealtors } from "@/hooks/useSavedRealtors";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, MapPin, Phone, Mail, Star, Award, Plus } from "lucide-react";
import { toast } from "sonner";

const SavedRealtorsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { savedIds, toggleSaved, isSaved } = useSavedRealtors();
  const [realtors, setRealtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealtors = async () => {
      if (savedIds.size === 0) {
        setRealtors([]);
        setLoading(false);
        return;
      }
      const ids = Array.from(savedIds);
      const { data } = await supabase
        .from("realtors")
        .select("*")
        .in("id", ids);
      const today = new Date(new Date().toDateString());
      const normalized = (data ?? []).map((r: any) => ({
        ...r,
        is_featured: r.is_featured && (!r.featured_expiration_date || new Date(r.featured_expiration_date) >= today),
      }));
      setRealtors(normalized);
      setLoading(false);
    };
    fetchRealtors();
  }, [savedIds]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleToggle = async (e: React.MouseEvent, realtorId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await toggleSaved(realtorId);
    if (success) {
      toast.success(isSaved(realtorId) ? "Removed from saved realtors" : "Saved realtor");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="h-7 w-7 text-accent" />
          <h1 className="font-display text-3xl font-bold text-foreground">Saved Realtors</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : realtors.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Bookmark className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">No saved realtors yet</h2>
            <p className="text-muted-foreground">Click the + icon on any realtor to save them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {realtors.map((realtor) => (
              <Link
                to={`/realtor/${realtor.id}`}
                key={realtor.id}
                className={`bg-card rounded-lg border p-6 shadow-card hover:shadow-lg transition-shadow block relative ${realtor.is_featured ? "border-accent ring-1 ring-accent/30" : "border-border"}`}
              >
                <button
                  onClick={(e) => handleToggle(e, realtor.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
                >
                  <Bookmark className="h-4 w-4 text-accent fill-accent" />
                </button>
                {realtor.is_featured && (
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-accent text-accent-foreground gap-1">
                      <Award className="h-3 w-3" /> Featured
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0">
                    {realtor.photo_url ? (
                      <img src={realtor.photo_url} alt={realtor.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                        {realtor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-foreground truncate">{realtor.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {realtor.city}
                    </p>
                    {realtor.years_experience && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 shrink-0" /> {realtor.years_experience} years
                      </p>
                    )}
                  </div>
                </div>
                {realtor.bio && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{realtor.bio}</p>}
                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  {realtor.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> Call
                    </span>
                  )}
                  {realtor.email && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SavedRealtorsPage;
