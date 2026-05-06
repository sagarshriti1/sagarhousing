import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Receipt, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { NEPAL_CITIES, NEPAL_DISTRICTS, getDistrictForCity } from "@/data/nepalLocations";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PaymentHistoryList from "@/components/PaymentHistoryList";

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
}

const ProfilePage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    email: "",
    phone: "",
    job_title: "",
    location: "",
    street_address: "",
    avatar_url: "",
  });

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
        setProfile({
          id: data.id,
          display_name: data.display_name ?? "",
          email: data.email ?? user.email ?? "",
          phone: data.phone ?? "",
          job_title: data.job_title ?? "",
          location: data.location ?? "",
          street_address: (data as any).street_address ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      } else {
        setProfile((p) => ({ ...p, email: user.email ?? "" }));
      }
      setLoading(false);
    })();
  }, [user]);

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
    };
    const { error } = profile.id
      ? await supabase.from("profiles").update(payload).eq("id", profile.id)
      : await supabase.from("profiles").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
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
      <main className="flex-1 container py-8 max-w-2xl">
        <h1 className="text-3xl font-display font-bold mb-6">My Profile</h1>
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
                    <Label>Display Name</Label>
                    <Input
                      value={profile.display_name ?? ""}
                      onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={profile.email ?? ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={profile.phone ?? ""}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                      value={profile.job_title ?? ""}
                      onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Street Address</Label>
                    <Input
                      value={profile.street_address ?? ""}
                      onChange={(e) => setProfile({ ...profile, street_address: e.target.value })}
                      placeholder="e.g. Thamel, Ward No. 26"
                      maxLength={200}
                    />
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

                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
