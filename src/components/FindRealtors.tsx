import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedRealtors } from "@/hooks/useSavedRealtors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Phone, Mail, ChevronRight, Star, Award, Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface Realtor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  city: string;
  state: string;
  bio: string | null;
  specialties: string[] | null;
  years_experience: number | null;
  is_featured: boolean;
}

const FindRealtors = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedRealtors();
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealtors = async () => {
      setLoading(true);
      let query = supabase.from("realtors").select("*").order("is_featured", { ascending: false }).limit(6);

      if (citySearch.trim()) {
        query = query.ilike("city", `%${citySearch.trim()}%`);
      }

      const { data } = await query;
      setRealtors(data ?? []);
      setLoading(false);
    };

    const debounce = setTimeout(fetchRealtors, 300);
    return () => clearTimeout(debounce);
  }, [citySearch]);

  return (
    <section className="bg-secondary/50 py-16">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">Find Local Realtors</h2>
            <p className="text-muted-foreground mt-1">
              Connect with experienced agents in your area
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by city..."
              className="pl-10 bg-background"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : realtors.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-lg border border-border">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-lg">
              {citySearch ? `No realtors found in "${citySearch}"` : "No realtors registered yet."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {citySearch ? "Try a different city" : "Be the first to register as a realtor!"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {realtors.map((realtor) => (
                <Link
                  to={`/realtor/${realtor.id}`}
                  key={realtor.id}
                  className={`bg-card rounded-lg border p-6 shadow-card hover:shadow-lg transition-shadow block relative ${realtor.is_featured ? "border-accent ring-1 ring-accent/30" : "border-border"}`}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!user) {
                        toast.error("Please sign in to save realtors");
                        navigate("/auth");
                        return;
                      }
                      toggleSaved(realtor.id).then((ok) => {
                        if (ok) toast.success(isSaved(realtor.id) ? "Removed from saved" : "Realtor saved");
                      });
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors z-10"
                  >
                    {isSaved(realtor.id) ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground hover:text-accent" />
                    )}
                  </button>
                  {realtor.is_featured && (
                    <div className="absolute -top-3 left-4">
                      <Badge className="bg-accent text-accent-foreground gap-1">
                        <Award className="h-3 w-3" /> Featured Agent
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0">
                      {realtor.photo_url ? (
                        <img
                          src={realtor.photo_url}
                          alt={realtor.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                          {realtor.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold text-foreground truncate">
                        {realtor.name}
                      </h3>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {realtor.city}{(realtor as any).district ? `, ${(realtor as any).district}` : ''}
                      </p>
                      {realtor.years_experience && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3.5 w-3.5 shrink-0" />
                          {realtor.years_experience} years experience
                        </p>
                      )}
                    </div>
                  </div>

                  {realtor.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {realtor.bio}
                    </p>
                  )}

                  {realtor.specialties && realtor.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {realtor.specialties.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-3 border-t border-border">
                    {realtor.phone && (
                      <a
                        href={`tel:${realtor.phone}`}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    )}
                    {realtor.email && (
                      <a
                        href={`mailto:${realtor.email}`}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/realtors">
                <Button variant="outline" className="gap-2">
                  View All Realtors <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default FindRealtors;
