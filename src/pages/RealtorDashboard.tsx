import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Plus, Camera, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { NEPAL_CITIES, NEPAL_DISTRICTS, getDistrictForCity } from '@/data/nepalLocations';
import SimulatedPaymentForm from "@/components/SimulatedPaymentForm";
import { useFeatureFlag, FEATURE_KEYS } from "@/hooks/useFeatureFlag";
import { logPayment } from "@/lib/paymentHistory";
import PaymentHistoryList from "@/components/PaymentHistoryList";

interface RealtorProfile {
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
  user_id: string | null;
  payment_status: string;
  payment_bypassed: boolean;
  start_date: string | null;
  expiration_date: string | null;
}

const RealtorDashboard = () => {
  const { user, role, loading } = useAuth();
  const { fee: SIGNUP_FEE, isFree: signupFree, promoLabel: signupPromoLabel } = useFeatureFlag(FEATURE_KEYS.REALTOR_SIGNUP);
  const [profile, setProfile] = useState<RealtorProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    street_address: "",
    city: "",
    district: "",
    state: "Nepal",
    bio: "",
    photo_url: "",
    license_number: "",
    years_experience: "",
    specialties: [] as string[],
  });

  const fetchProfile = async () => {
    if (!user) return;
    setDataLoading(true);
    const { data } = await supabase
      .from("realtors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setPaymentComplete(data.payment_status === "paid" || data.payment_status === "bypassed");
      setFormData({
        name: data.name,
        email: data.email ?? "",
        phone: data.phone ?? "",
        street_address: (data as any).street_address ?? "",
        city: data.city,
        district: (data as any).district ?? getDistrictForCity(data.city) ?? "",
        state: "Nepal",
        bio: data.bio ?? "",
        photo_url: data.photo_url ?? "",
        license_number: data.license_number ?? "",
        years_experience: data.years_experience?.toString() ?? "",
        specialties: data.specialties ?? [],
      });
    } else {
      setIsCreating(true);
    }
    setDataLoading(false);
  };

  useEffect(() => {
    if (role === "realtor" || role === "admin") fetchProfile();
  }, [role, user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || (role !== "realtor" && role !== "admin")) return <Navigate to="/" replace />;

  const handlePaymentComplete = async () => {
    setPaymentComplete(true);
    const now = new Date();
    const expiration = new Date(now);
    expiration.setMonth(expiration.getMonth() + 1);

    toast.success("Payment successful! 🎉", {
      description: signupFree
        ? "Free promotion applied. Your profile is active for 1 month."
        : `Your payment of Rs. ${SIGNUP_FEE.toLocaleString()} has been received. Your profile is active for 1 month.`,
      duration: 5000,
    });

    // If profile exists, update payment status and dates in DB
    if (profile) {
      await supabase
        .from("realtors")
        .update({
          payment_status: "paid",
          start_date: now.toISOString().split("T")[0],
          expiration_date: expiration.toISOString().split("T")[0],
        })
        .eq("id", profile.id);
      setProfile({
        ...profile,
        payment_status: "paid",
        start_date: now.toISOString().split("T")[0],
        expiration_date: expiration.toISOString().split("T")[0],
      });
    }

    // Log payment event (renewal if profile already existed, signup otherwise)
    await logPayment({
      user_id: user!.id,
      service_key: profile ? FEATURE_KEYS.REALTOR_RENEWAL : FEATURE_KEYS.REALTOR_SIGNUP,
      service_label: profile ? "Realtor Renewal" : "Realtor Signup",
      related_type: "realtor",
      related_id: profile?.id ?? null,
      related_label: profile?.name ?? formData.name,
      amount: signupFree ? 0 : SIGNUP_FEE,
      status: signupFree ? "promotion" : "paid",
      promo_label: signupFree ? signupPromoLabel : null,
      expiration_date: expiration.toISOString(),
    });
  };

  const saveProfile = async () => {
    if (!formData.name || !formData.district) {
      toast.error("Name and district are required");
      return;
    }

    if (isCreating && !paymentComplete) {
      toast.error("Please complete payment before creating your profile");
      return;
    }

    setSaving(true);
    const payload = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      street_address: formData.street_address || null,
      city: formData.city,
      district: formData.district,
      state: "Nepal",
      bio: formData.bio || null,
      photo_url: formData.photo_url || null,
      license_number: formData.license_number || null,
      years_experience: formData.years_experience ? Number(formData.years_experience) : null,
      specialties: formData.specialties,
      user_id: user!.id,
      ...(isCreating ? {
        payment_status: "paid",
        start_date: new Date().toISOString().split("T")[0],
        expiration_date: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split("T")[0]; })(),
      } : {}),
    };

    if (profile) {
      const { error } = await supabase.from("realtors").update(payload).eq("id", profile.id);
      if (error) toast.error("Failed to save profile");
      else {
        toast.success("Profile updated!");
        setProfile({ ...profile, ...payload } as RealtorProfile);
      }
    } else {
      const { data, error } = await supabase.from("realtors").insert(payload).select().single();
      if (error) toast.error("Failed to create profile");
      else {
        toast.success("Profile created!");
        setProfile(data);
        setIsCreating(false);
      }
    }
    setSaving(false);
  };


  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData({ ...formData, specialties: [...formData.specialties, newSpecialty.trim()] });
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (s: string) => {
    setFormData({ ...formData, specialties: formData.specialties.filter((sp) => sp !== s) });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/profile.${ext}`;

    await supabase.storage.from("realtor-photos").remove([filePath]);

    const { error } = await supabase.storage
      .from("realtor-photos")
      .upload(filePath, file, { upsert: true });

    if (error) {
      toast.error("Failed to upload photo");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("realtor-photos")
      .getPublicUrl(filePath);

    setFormData({ ...formData, photo_url: urlData.publicUrl });
    toast.success("Photo uploaded!");
    setUploading(false);
  };

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
            {/* Payment Card — shown when creating new profile */}
            {isCreating && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Subscription Payment
                  </CardTitle>
                  <CardDescription>
                    {signupFree
                      ? (signupPromoLabel || "🎉 Free promotion active — no payment required to create your realtor profile.")
                      : `A monthly fee of Rs. ${SIGNUP_FEE.toLocaleString()} is required to create your realtor profile and appear in the directory.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {signupFree ? (
                    <Button
                      onClick={handlePaymentComplete}
                      disabled={paymentComplete}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {paymentComplete ? "Activated ✓" : "Activate Profile (Free)"}
                    </Button>
                  ) : (
                    <SimulatedPaymentForm
                      paid={paymentComplete}
                      onPaymentComplete={handlePaymentComplete}
                      amount={SIGNUP_FEE}
                      label="Realtor monthly subscription"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Subscription Status Card */}
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
                      <p className="text-xs text-muted-foreground">
                        Rs. {SIGNUP_FEE.toLocaleString()}/month — auto-renewal required
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {new Date(profile.expiration_date) > new Date() ? 'Active' : 'Expired'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
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

            {/* Profile Form */}
            <Card>
              <CardHeader>
                <CardTitle>{isCreating ? "Create Your Realtor Profile" : "Edit Profile"}</CardTitle>
                <CardDescription>
                  {isCreating
                    ? "Set up your public realtor profile to start connecting with clients"
                    : "Update your information visible to potential clients"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Contact email" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" />
                  </div>
                  <div>
                    <Label>Years of Experience</Label>
                    <Input type="number" value={formData.years_experience} onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })} placeholder="e.g. 10" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Street Address</Label>
                    <Input value={formData.street_address} onChange={(e) => setFormData({ ...formData, street_address: e.target.value })} placeholder="e.g. Thamel, Ward No. 26" />
                  </div>
                   <div>
                     <Label>City</Label>
                     <Select value={formData.city} onValueChange={(v) => {
                       const district = getDistrictForCity(v);
                       setFormData({ ...formData, city: v, ...(district ? { district } : {}) });
                     }}>
                       <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                       <SelectContent>
                         {NEPAL_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                   <div>
                     <Label>District *</Label>
                     <Select value={formData.district} onValueChange={(v) => {
                       const cityDistrict = getDistrictForCity(formData.city);
                       setFormData({ ...formData, district: v, ...(cityDistrict !== v ? { city: '' } : {}) });
                     }}>
                       <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                       <SelectContent>
                         {NEPAL_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                  <div>
                    <Label>License Number</Label>
                    <Input value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} placeholder="License #" />
                  </div>
                  </div>

                {/* Profile Photo Upload */}
                <div>
                  <Label>Profile Photo</Label>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="h-20 w-20 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        {uploading ? "Uploading..." : "Upload Photo"}
                      </Button>
                      <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 5MB.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Bio</Label>
                  <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell potential clients about yourself..." rows={4} />
                </div>

                <div>
                  <Label>Specialties</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      placeholder="e.g. Luxury Homes"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addSpecialty}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.specialties.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/20"
                          onClick={() => removeSpecialty(s)}
                        >
                          {s} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={saveProfile}
                    disabled={saving || (isCreating && !paymentComplete)}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : isCreating ? "Create Profile" : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default RealtorDashboard;
