import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Award, Megaphone, DollarSign, Save, Plus, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

const NEPAL_CITIES = [
  'Bhaktapur','Bharatpur','Biratnagar','Birgunj','Butwal','Damak','Dhangadhi',
  'Dharan','Ghorahi','Hetauda','Itahari','Janakpur','Kathmandu','Lalitpur',
  'Nepalgunj','Pokhara','Siddharthanagar','Tulsipur',
];

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
}

const MONTHLY_AD_PRICE = 1000;

const RealtorDashboard = () => {
  const { user, role, loading } = useAuth();
  const [profile, setProfile] = useState<RealtorProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for new profile
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
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
      setFormData({
        name: data.name,
        email: data.email ?? "",
        phone: data.phone ?? "",
        city: data.city,
        state: data.state,
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

  const saveProfile = async () => {
    if (!formData.name || !formData.city || !formData.state) {
      toast.error("Name, city, and state are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      city: formData.city,
      state: formData.state,
      bio: formData.bio || null,
      photo_url: formData.photo_url || null,
      license_number: formData.license_number || null,
      years_experience: formData.years_experience ? Number(formData.years_experience) : null,
      specialties: formData.specialties,
      user_id: user!.id,
    };

    if (profile) {
      const { error } = await supabase.from("realtors").update(payload).eq("id", profile.id);
      if (error) toast.error("Failed to save profile");
      else {
        toast.success("Profile updated!");
        setProfile({ ...profile, ...payload });
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

  const toggleAdvertise = async () => {
    if (!profile) return;
    const newFeatured = !profile.is_featured;

    // Payment bypass — in future, check payment before enabling
    // if (newFeatured) { await verifyPayment(); }

    const { error } = await supabase
      .from("realtors")
      .update({ is_featured: newFeatured })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update advertising status");
    } else {
      toast.success(newFeatured ? "Your profile is now advertised! 🎉" : "Advertising disabled");
      setProfile({ ...profile, is_featured: newFeatured });
    }
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

    // Remove old photo if exists
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
          <Megaphone className="h-7 w-7 text-accent" />
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
            {/* Advertise Card */}
            {profile && (
              <Card className={profile.is_featured ? "border-accent ring-1 ring-accent/30" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-accent" />
                    Advertise Your Profile
                  </CardTitle>
                  <CardDescription>
                    Get featured in the "Find Local Realtors" section on the homepage and directory.
                    Advertised profiles appear first with a highlighted badge.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Rs. {MONTHLY_AD_PRICE.toLocaleString()}/month
                        </span>
                        <Badge variant="secondary" className="text-xs">Free during beta</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {profile.is_featured
                          ? "Your profile is currently being advertised"
                          : "Enable to boost your visibility"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {profile.is_featured && (
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      )}
                      <Switch
                        checked={profile.is_featured}
                        onCheckedChange={toggleAdvertise}
                      />
                    </div>
                  </div>
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
                  <div>
                    <Label>City *</Label>
                    <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" />
                  </div>
                  <div>
                    <Label>State *</Label>
                    <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="State" />
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
                  <Button onClick={saveProfile} disabled={saving} className="gap-2">
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
