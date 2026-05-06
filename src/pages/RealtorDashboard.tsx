import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link, Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { useFeatureFlag, FEATURE_KEYS } from "@/hooks/useFeatureFlag";
import PaymentHistoryList from "@/components/PaymentHistoryList";

interface RealtorProfile {
  id: string;
  name: string;
  payment_status: string;
  start_date: string | null;
  expiration_date: string | null;
}

const RealtorDashboard = () => {
  const { user, role, loading } = useAuth();
  const { fee: SIGNUP_FEE } = useFeatureFlag(FEATURE_KEYS.REALTOR_SIGNUP);
  const [profile, setProfile] = useState<RealtorProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setDataLoading(true);
      const { data } = await supabase
        .from("realtors")
        .select("id, name, payment_status, start_date, expiration_date")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(data);
      setDataLoading(false);
    };
    if (role === "realtor" || role === "admin") fetchProfile();
  }, [role, user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || (role !== "realtor" && role !== "admin")) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-7 w-7 text-accent" />
          <h1 className="font-display text-3xl font-bold text-foreground">Realtor Dashboard</h1>
        </div>

        {dataLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {!profile && (
              <Card>
                <CardHeader>
                  <CardTitle>Activate your realtor profile</CardTitle>
                  <CardDescription>
                    Head to your profile and use “Promote Your Profile” to subscribe and appear in the directory.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link to="/profile">Go to My Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {profile && profile.expiration_date && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Subscription Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-foreground font-medium">
                        Active until: {new Date(profile.expiration_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {new Date(profile.expiration_date) > new Date() ? 'Active' : 'Expired'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment History
                  </CardTitle>
                  <CardDescription>All payments and renewals tied to your realtor profile.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentHistoryList relatedType="realtor" relatedId={profile.id} compact />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default RealtorDashboard;
