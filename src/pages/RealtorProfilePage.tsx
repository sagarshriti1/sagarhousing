import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedRealtors } from "@/hooks/useSavedRealtors";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeaturedListings from "@/components/FeaturedListings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Star, Award, Briefcase, Bookmark, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Realtor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  city: string;
  state: string;
  street_address: string | null;
  district: string | null;
  bio: string | null;
  specialties: string[] | null;
  years_experience: number | null;
  is_featured: boolean;
  license_number: string | null;
  user_id: string | null;
  contact_details?: string | null;
}

const RealtorProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedRealtors();
  const [realtor, setRealtor] = useState<Realtor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data } = await supabase.from("realtors").select("*").eq("id", id).maybeSingle();
      if (data) {
        let contactDetails = null;
        if (data.user_id) {
          const { data: profile } = await supabase.from('profiles').select('contact_details').eq('user_id', data.user_id).maybeSingle();
          if (profile) contactDetails = profile.contact_details;
        }
        const today = new Date(new Date().toDateString());
        const featuredActive = data.is_featured && (!data.featured_expiration_date || new Date(data.featured_expiration_date) >= today);
        setRealtor({ ...data, is_featured: featuredActive, contact_details: contactDetails } as any);
      } else {
        setRealtor(null);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</main>
      <Footer />
    </div>
  );

  if (!realtor) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Realtor not found.</p>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 max-w-5xl">
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {/* Header section */}
          <div className="bg-secondary/50 p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="h-28 w-28 rounded-full bg-muted overflow-hidden shrink-0 ring-4 ring-background">
                {realtor.photo_url ? (
                  <img src={realtor.photo_url} alt={realtor.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                    {realtor.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left space-y-2">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="font-display text-2xl font-bold text-foreground">{realtor.name}</h1>
                  {realtor.is_featured && (
                    <Badge className="bg-accent text-accent-foreground gap-1">
                      <Award className="h-3 w-3" /> Featured
                    </Badge>
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-muted-foreground justify-center sm:justify-start">
                  <MapPin className="h-4 w-4 shrink-0" /> 
                  {[realtor.street_address, realtor.city, realtor.district].filter(Boolean).join(', ')}
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground justify-center sm:justify-start">
                  <Star className="h-4 w-4 shrink-0" /> {realtor.years_experience !== null ? `${realtor.years_experience} years experience` : "Experience: Not provided"}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground justify-center sm:justify-start">
                  <Briefcase className="h-4 w-4 shrink-0" /> License: {realtor.license_number || "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (!user) {
                    toast.error("Please sign in to save realtors");
                    navigate("/auth");
                    return;
                  }
                  toggleSaved(realtor.id).then((ok) => {
                    if (ok) toast.success(isSaved(realtor.id) ? "Removed from saved" : "Realtor saved");
                  });
                }}
              >
                <Bookmark className={`h-4 w-4 ${isSaved(realtor.id) ? "text-accent fill-accent" : ""}`} />
                {isSaved(realtor.id) ? "Saved" : "Save Realtor"}
              </Button>
              {realtor.user_id && (
                <Button asChild className="gap-2">
                  <Link to={`/realtor/${realtor.user_id}/listings`}>
                    <Building2 className="h-4 w-4" />
                    View Listings
                  </Link>
                </Button>
              )}
            </div>
          </div>
          {/* Body */}
          <div className="p-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">About Me</h2>
              <p className="text-muted-foreground whitespace-pre-line">{realtor.bio || "No bio provided."}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">Additional Info</h2>
              <p className="text-muted-foreground whitespace-pre-line">{realtor.contact_details || "No additional info provided."}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">Specialties</h2>
              {realtor.specialties && realtor.specialties.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {realtor.specialties.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No specialties listed.</p>
              )}
            </div>

            {/* Contact */}
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-3">Contact</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                {realtor.phone ? (
                  <a
                    href={`tel:${realtor.phone}`}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-foreground"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" /> {realtor.phone}
                  </a>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-secondary/20 text-muted-foreground">
                    <Phone className="h-4 w-4 opacity-50" /> Not provided
                  </div>
                )}
                {realtor.email ? (
                  <a
                    href={`mailto:${realtor.email}`}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-foreground"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" /> {realtor.email}
                  </a>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-secondary/20 text-muted-foreground">
                    <Mail className="h-4 w-4 opacity-50" /> Not provided
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Listings Section */}
        {realtor.user_id && (
          <div className="mt-12 pt-8 border-t border-border">
            <FeaturedListings 
              realtorId={realtor.user_id} 
              hideFilters={true}
              limit={6}
              showViewAll={true}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default RealtorProfilePage;
