import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Star, Pencil, Trash2, Shield, Users, Home, MapPin } from "lucide-react";
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
  user_id: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "realtor" | "user";
}

interface Property {
  id: string;
  title: string;
  city: string;
  state: string;
  price: number;
  status: string;
  listing_type: string;
  user_id: string;
}

const AdminDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [editingRealtor, setEditingRealtor] = useState<Realtor | null>(null);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchAll = async () => {
    setDataLoading(true);
    const [r, p, ro, pr] = await Promise.all([
      supabase.from("realtors").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("user_properties").select("id, title, city, state, price, status, listing_type, user_id"),
    ]);
    setRealtors(r.data ?? []);
    setProfiles(p.data ?? []);
    setRoles(ro.data ?? []);
    setProperties(pr.data ?? []);
    setDataLoading(false);
  };

  useEffect(() => {
    if (role === "admin") fetchAll();
  }, [role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || role !== "admin") return <Navigate to="/" replace />;

  const toggleFeatured = async (realtor: Realtor) => {
    const { error } = await supabase
      .from("realtors")
      .update({ is_featured: !realtor.is_featured })
      .eq("id", realtor.id);
    if (error) {
      toast.error("Failed to update featured status");
    } else {
      toast.success(realtor.is_featured ? "Realtor unfeatured" : "Realtor featured!");
      setRealtors((prev) =>
        prev.map((r) => (r.id === realtor.id ? { ...r, is_featured: !r.is_featured } : r))
      );
    }
  };

  const deleteRealtor = async (id: string) => {
    const { error } = await supabase.from("realtors").delete().eq("id", id);
    if (error) toast.error("Failed to delete realtor");
    else {
      toast.success("Realtor deleted");
      setRealtors((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const saveRealtor = async () => {
    if (!editingRealtor) return;
    const { id, ...rest } = editingRealtor;
    const { error } = await supabase.from("realtors").update(rest).eq("id", id);
    if (error) toast.error("Failed to save realtor");
    else {
      toast.success("Realtor updated");
      setRealtors((prev) => prev.map((r) => (r.id === id ? editingRealtor : r)));
      setEditingRealtor(null);
    }
  };

  const saveProfile = async () => {
    if (!editingProfile) return;
    const { id, ...rest } = editingProfile;
    const { error } = await supabase.from("profiles").update(rest).eq("id", id);
    if (error) toast.error("Failed to save profile");
    else {
      toast.success("Profile updated");
      setProfiles((prev) => prev.map((p) => (p.id === id ? editingProfile : p)));
      setEditingProfile(null);
    }
  };

  const changeRole = async (userId: string, newRole: "admin" | "realtor" | "user") => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);
    if (error) toast.error("Failed to update role");
    else {
      toast.success("Role updated");
      setRoles((prev) =>
        prev.map((r) => (r.user_id === userId ? { ...r, role: newRole } : r))
      );
    }
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase.from("user_properties").delete().eq("id", id);
    if (error) toast.error("Failed to delete property");
    else {
      toast.success("Property deleted");
      setProperties((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filteredRealtors = realtors.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeVariant = (r: string) => {
    if (r === "admin") return "destructive" as const;
    if (r === "realtor") return "default" as const;
    return "secondary" as const;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-7 w-7 text-accent" />
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="realtors" className="space-y-6">
          <TabsList>
            <TabsTrigger value="realtors" className="gap-2"><MapPin className="h-4 w-4" /> Realtors</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users & Roles</TabsTrigger>
            <TabsTrigger value="properties" className="gap-2"><Home className="h-4 w-4" /> Properties</TabsTrigger>
          </TabsList>

          {/* REALTORS TAB */}
          <TabsContent value="realtors" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search realtors..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <p className="text-sm text-muted-foreground">
                {realtors.filter((r) => r.is_featured).length} featured
              </p>
            </div>

            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRealtors.map((realtor) => (
                    <TableRow key={realtor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {realtor.photo_url ? (
                              <img src={realtor.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              realtor.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{realtor.name}</p>
                            <p className="text-xs text-muted-foreground">{realtor.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{realtor.city}</TableCell>
                      <TableCell>{realtor.years_experience ?? "—"} yrs</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={realtor.is_featured} onCheckedChange={() => toggleFeatured(realtor)} />
                          {realtor.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingRealtor(realtor)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteRealtor(realtor.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRealtors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No realtors found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => {
                    const userRole = roles.find((r) => r.user_id === profile.user_id);
                    return (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{profile.display_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{profile.user_id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>{profile.phone || "—"}</TableCell>
                        <TableCell>
                          {userRole ? (
                            <Select value={userRole.role} onValueChange={(v) => changeRole(profile.user_id, v as any)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="realtor">Realtor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary">No role</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setEditingProfile(profile)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* PROPERTIES TAB */}
          <TabsContent value="properties" className="space-y-4">
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((prop) => (
                    <TableRow key={prop.id}>
                      <TableCell className="font-medium text-foreground">{prop.title}</TableCell>
                      <TableCell>{prop.city}</TableCell>
                      <TableCell>Rs. {prop.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={prop.status === "active" ? "default" : "secondary"}>{prop.status}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{prop.listing_type}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/edit-property/${prop.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteProperty(prop.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {properties.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No properties found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

      {/* Edit Realtor Dialog */}
      <Dialog open={!!editingRealtor} onOpenChange={(open) => !open && setEditingRealtor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Realtor</DialogTitle>
          </DialogHeader>
          {editingRealtor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={editingRealtor.name} onChange={(e) => setEditingRealtor({ ...editingRealtor, name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editingRealtor.email ?? ""} onChange={(e) => setEditingRealtor({ ...editingRealtor, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={editingRealtor.phone ?? ""} onChange={(e) => setEditingRealtor({ ...editingRealtor, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Years Experience</Label>
                  <Input type="number" value={editingRealtor.years_experience ?? ""} onChange={(e) => setEditingRealtor({ ...editingRealtor, years_experience: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={editingRealtor.city} onChange={(e) => setEditingRealtor({ ...editingRealtor, city: e.target.value })} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={editingRealtor.state} onChange={(e) => setEditingRealtor({ ...editingRealtor, state: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={editingRealtor.bio ?? ""} onChange={(e) => setEditingRealtor({ ...editingRealtor, bio: e.target.value })} />
              </div>
              <div>
                <Label>Photo URL</Label>
                <Input value={editingRealtor.photo_url ?? ""} onChange={(e) => setEditingRealtor({ ...editingRealtor, photo_url: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingRealtor.is_featured} onCheckedChange={(checked) => setEditingRealtor({ ...editingRealtor, is_featured: checked })} />
                <Label>Featured / Advertised</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingRealtor(null)}>Cancel</Button>
                <Button onClick={saveRealtor}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <div className="space-y-4">
              <div>
                <Label>Display Name</Label>
                <Input value={editingProfile.display_name ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, display_name: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editingProfile.phone ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })} />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={editingProfile.bio ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, bio: e.target.value })} />
              </div>
              <div>
                <Label>Avatar URL</Label>
                <Input value={editingProfile.avatar_url ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, avatar_url: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
                <Button onClick={saveProfile}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
