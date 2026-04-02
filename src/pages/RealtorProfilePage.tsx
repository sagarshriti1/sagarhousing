import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Star, Award, Briefcase, Clock } from "lucide-react";

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
  license_number: string | null;
}

const RealtorProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [realtor, setRealtor] = useState<Realtor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data } = await supabase.from("realtors").select("*").eq("id", id).maybeSingle();
      setRealtor(data);
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
      <main className="flex-1 container py-8 max-w-3xl">
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
                  <MapPin className="h-4 w-4 shrink-0" /> {realtor.city}{(realtor as any).district ? `, ${(realtor as any).district}` : ''}
                </p>
                {realtor.years_experience && (
                  <p className="flex items-center gap-1.5 text-muted-foreground justify-center sm:justify-start">
                    <Star className="h-4 w-4 shrink-0" /> {realtor.years_experience} years experience
                  </p>
                )}
                {realtor.license_number && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground justify-center sm:justify-start">
                    <Briefcase className="h-4 w-4 shrink-0" /> License: {realtor.license_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-6">
            {realtor.bio && (
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">About</h2>
                <p className="text-muted-foreground whitespace-pre-line">{realtor.bio}</p>
              </div>
            )}

            {realtor.specialties && realtor.specialties.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {realtor.specialties.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-3">Contact</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                {realtor.phone && (
                  <a
                    href={`tel:${realtor.phone}`}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-foreground"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" /> {realtor.phone}
                  </a>
                )}
                {realtor.email && (
                  <a
                    href={`mailto:${realtor.email}`}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-foreground"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" /> {realtor.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RealtorProfilePage;
