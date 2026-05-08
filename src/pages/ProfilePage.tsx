import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, CreditCard, Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { NEPAL_CITIES, NEPAL_DISTRICTS, getDistrictForCity } from "@/data/nepalLocations";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ConfirmSaveButton from "@/components/ConfirmSaveButton";

import SimulatedPaymentForm from "@/components/SimulatedPaymentForm";
import { useFeatureFlag, FEATURE_KEYS } from "@/hooks/useFeatureFlag";
import { logPayment } from "@/lib/paymentHistory";
import { Badge } from "@/components/ui/badge";
import { CardDescription } from "@/components/ui/card";
import { isFeaturedActive, addOneMonthISO, todayISO, markFeaturedExpiredIfNeeded } from "@/lib/featuredStatus";

const parseLocation = (loc: string | null | undefined): { city: string; district: string } => {
  if (!loc) return { city: "", district: "" };
  const [city, district] = loc.split(",").map((s) => s.trim());
  return { city: city || "", district: district || "" };
};
const joinLocation = (city: string, district: string) => [city, district].filter(Boolean).join(", ");

interface ProfileData {
  id?: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  location: string | null;
  street_address: string | null;
  avatar_url: string | null;
  contact_details: string | null;
  bio: string | null;
}

interface RealtorRow {
  id: string;
  name: string;
  is_featured: boolean;
  featured_start_date: string | null;
  featured_expiration_date: string | null;
  featured_payment_status: string | null;
}

const ProfilePage = () => {
  const { user, role } = useAuth();
  const { fee: FEATURED_FEE, isFree: featuredFree, promoLabel: featuredPromoLabel } = useFeatureFlag(FEATURE_KEYS.FEATURED_REALTOR);
  const [realtor, setRealtor] = useState<RealtorRow | null>(null);
  const [activating, setActivating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profile, setProfileState] = useState<ProfileData>({
    display_name: "",
    email: "",
    phone: "",
    job_title: "",
    location: "",
    street_address: "",
    avatar_url: "",
    contact_details: "",
    bio: "",
  });
  const setProfile = (next: ProfileData | ((p: ProfileData) => ProfileData)) => {
    setDirty(true);
    setProfileState(next as any);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast.error("Failed to load profile");
      } else if (data) {
        setProfileState({
          id: data.id,
          display_name: data.display_name ?? "",
          email: data.email ?? user.email ?? "",
          phone: data.phone ?? "",
          job_title: data.job_title ?? "",
          location: data.location ?? "",
          street_address: (data as any).street_address ?? "",
          avatar_url: data.avatar_url ?? "",
          contact_details: (data as any).contact_details ?? "",
          bio: (data as any).bio ?? "",
        });
      } else {
        setProfileState((p) => ({ ...p, email: user.email ?? "" }));
      }
      setDirty(false);
      setLoading(false);
    })();
  }, [user]);

  const fetchRealtor = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("realtors")
      .select("id, name, is_featured, featured_start_date, featured_expiration_date, featured_payment_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      // Lazy expire if needed
      const expired = await markFeaturedExpiredIfNeeded(data.id, data);
      if (expired) {
        setRealtor({ ...data, is_featured: false, featured_payment_status: "expired" });
      } else {
        setRealtor(data);
      }
    } else {
      setRealtor(null);
    }
  };

  useEffect(() => {
    if (role === "realtor") fetchRealtor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user]);

  const handleBecomeFeatured = async () => {
    if (!user) return;
    setActivating(true);

    const start = todayISO();
    const expiration = addOneMonthISO(start);
    const status = featuredFree ? "promotion" : "paid";

    let current = realtor;

    if (!current) {
      const loc = parseLocation(profile.location);
      const { data, error } = await supabase
        .from("realtors")
        .insert({
          user_id: user.id,
          name: profile.display_name || user.email || "Realtor",
          email: profile.email || user.email,
          phone: profile.phone,
          street_address: profile.street_address,
          city: loc.city,
          district: loc.district,
          state: "Nepal",
          payment_status: "paid",
          is_featured: true,
          featured_start_date: start,
          featured_expiration_date: expiration,
          featured_payment_status: status,
        })
        .select("id, name, is_featured, featured_start_date, featured_expiration_date, featured_payment_status")
        .single();
      if (error || !data) {
        toast.error("Failed to create realtor profile");
        setActivating(false);
        return;
      }
      current = data;
      setRealtor(data);
    } else {
      const { error } = await supabase
        .from("realtors")
        .update({
          is_featured: true,
          featured_start_date: start,
          featured_expiration_date: expiration,
          featured_payment_status: status,
        })
        .eq("id", current.id);
      if (error) {
        toast.error("Failed to mark as featured");
        setActivating(false);
        return;
      }
      setRealtor({
        ...current,
        is_featured: true,
        featured_start_date: start,
        featured_expiration_date: expiration,
        featured_payment_status: status,
      });
    }

    await logPayment({
      user_id: user.id,
      service_key: FEATURE_KEYS.FEATURED_REALTOR,
      service_label: "Featured Realtor",
      related_type: "realtor",
      related_id: current.id,
      related_label: current.name,
      amount: featuredFree ? 0 : FEATURED_FEE,
      status: featuredFree ? "promotion" : "paid",
      promo_label: featuredFree ? featuredPromoLabel : null,
      expiration_date: new Date(expiration).toISOString(),
    });

    toast.success("You're now featured! ⭐", {
      description: featuredFree
        ? "Free promotion applied — your profile is boosted in the directory."
        : `Payment of Rs. ${FEATURED_FEE.toLocaleString()} received.`,
    });
    setActivating(false);
  };


  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("realtor-photos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("realtor-photos").getPublicUrl(path);
      setProfile((p) => ({ ...p, avatar_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const errs: Record<string, string> = {};
    if (!profile.display_name || !profile.display_name.trim()) errs.display_name = 'Display name is required';
    if (Object.keys(errs).length) { setProfileErrors(errs); return; }
    setProfileErrors({});
    setSaving(true);
    const payload = {
      user_id: user.id,
      display_name: profile.display_name,
      phone: profile.phone,
      job_title: profile.job_title,
      location: profile.location,
      street_address: profile.street_address,
      avatar_url: profile.avatar_url,
      email: profile.email,
      contact_details: profile.contact_details,
      bio: profile.bio,
    };
    const { error } = profile.id
      ? await supabase.from("profiles").update(payload).eq("id", profile.id)
      : await supabase.from("profiles").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setDirty(false);
      toast.success("Profile updated");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <p className="text-muted-foreground">Please sign in to view your profile.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 max-w-3xl">
        <h1 className="text-3xl font-display font-bold mb-6">My Profile</h1>
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList>
            <TabsTrigger value="info" className="gap-2"><UserIcon className="h-4 w-4" /> Personal Info</TabsTrigger>
            {role === "realtor" && (
              <TabsTrigger value="promote" className="gap-2"><CreditCard className="h-4 w-4" /> Promote Your Profile</TabsTrigger>
            )}
            
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profile.avatar_url ?? undefined} />
                        <AvatarFallback>{profile.display_name?.[0] ?? user.email?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                          Upload Photo
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Display Name *</Label>
                        <Input value={profile.display_name ?? ""} onChange={(e) => { setProfile({ ...profile, display_name: e.target.value }); if (profileErrors.display_name) setProfileErrors(({ display_name, ...r }) => r); }} maxLength={100} aria-invalid={!!profileErrors.display_name} />
                        {profileErrors.display_name && <p className="text-xs text-destructive">{profileErrors.display_name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={profile.email ?? ""} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={30} />
                      </div>
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        <Input value={profile.job_title ?? ""} onChange={(e) => setProfile({ ...profile, job_title: e.target.value })} maxLength={100} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Street Address</Label>
                        <Input value={profile.street_address ?? ""} onChange={(e) => setProfile({ ...profile, street_address: e.target.value })} placeholder="e.g. Thamel, Ward No. 26" maxLength={200} />
                      </div>
                      {(() => {
                        const loc = parseLocation(profile.location);
                        return (
                          <>
                            <div className="space-y-2">
                              <Label>City</Label>
                              <Select
                                value={loc.city}
                                onValueChange={(city) => {
                                  const district = getDistrictForCity(city) || loc.district;
                                  setProfile({ ...profile, location: joinLocation(city, district) });
                                }}
                              >
                                <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                                <SelectContent>
                                  {NEPAL_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>District</Label>
                              <Select
                                value={loc.district}
                                onValueChange={(district) => {
                                  const cityDist = getDistrictForCity(loc.city);
                                  const nextCity = cityDist && cityDist !== district ? "" : loc.city;
                                  setProfile({ ...profile, location: joinLocation(nextCity, district) });
                                }}
                              >
                                <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                                <SelectContent>
                                  {NEPAL_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="space-y-2">
                      <Label>Contact Details for Viewers</Label>
                      <Textarea
                        rows={6}
                        maxLength={600}
                        placeholder="Phone, WhatsApp, office address, etc."
                        value={profile.contact_details ?? ""}
                        onChange={(e) => {
                          const lines = e.target.value.split("\n");
                          const trimmed = lines.length > 6 ? lines.slice(0, 6).join("\n") : e.target.value;
                          setProfile({ ...profile, contact_details: trimmed });
                        }}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">Shown publicly on your property listings. Max 6 lines.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>About Me</Label>
                      <Textarea
                        rows={5}
                        maxLength={1000}
                        placeholder="Tell others a bit about yourself..."
                        value={profile.bio ?? ""}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Max 1000 characters.</p>
                    </div>

                    <ConfirmSaveButton onConfirm={handleSave} disabled={saving || !dirty}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Changes
                    </ConfirmSaveButton>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {role === "realtor" && (
            <TabsContent value="promote">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Promote Your Profile
                  </CardTitle>
                  <CardDescription>
                    {featuredFree
                      ? (featuredPromoLabel || "🎉 Free promotion active — get featured at no cost and stand out in the directory.")
                      : `Become a Featured Realtor for Rs. ${FEATURED_FEE.toLocaleString()}/month and get top placement in the directory.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {realtor && (() => {
                    const featuredActive = isFeaturedActive(realtor);
                    const expiredButFlagged =
                      realtor.featured_expiration_date &&
                      new Date(realtor.featured_expiration_date) < new Date(new Date().toDateString());
                    return (
                      <>
                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{realtor.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {featuredActive
                                ? `Boosted in the directory · until ${new Date(realtor.featured_expiration_date!).toLocaleDateString()}`
                                : expiredButFlagged
                                  ? `Featured placement expired on ${new Date(realtor.featured_expiration_date!).toLocaleDateString()}`
                                  : "Standard listing"}
                            </p>
                          </div>
                          <Badge variant={featuredActive ? "default" : "secondary"} className="text-xs">
                            {featuredActive ? "Featured ⭐" : expiredButFlagged ? "Expired" : "Not Featured"}
                          </Badge>
                        </div>

                        {featuredActive ? (
                          <Button disabled className="w-full">Already Featured ✓</Button>
                        ) : featuredFree ? (
                          <Button
                            onClick={handleBecomeFeatured}
                            disabled={activating}
                            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            {activating ? "Activating..." : expiredButFlagged ? "Renew Featured (Free)" : "Become Featured (Free)"}
                          </Button>
                        ) : (
                          <SimulatedPaymentForm
                            paid={false}
                            onPaymentComplete={handleBecomeFeatured}
                            amount={FEATURED_FEE}
                            label={expiredButFlagged ? "Featured Realtor renewal" : "Featured Realtor placement"}
                          />
                        )}
                      </>
                    );
                  })()}

                  {!realtor && (
                    featuredFree ? (
                      <Button
                        onClick={handleBecomeFeatured}
                        disabled={activating}
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {activating ? "Activating..." : "Become Featured (Free)"}
                      </Button>
                    ) : (
                      <SimulatedPaymentForm
                        paid={false}
                        onPaymentComplete={handleBecomeFeatured}
                        amount={FEATURED_FEE}
                        label="Featured Realtor placement"
                      />
                    )
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
