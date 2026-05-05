import { useState, useEffect, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Star, Pencil, Trash2, Shield, Users, Home, MapPin, Plus, Camera, Loader2, KeyRound, UserCheck, UserX, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import RealtorFormDialog, { type RealtorFormData } from "@/components/admin/RealtorFormDialog";

interface Realtor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  city: string;
  state: string;
  district: string;
  bio: string | null;
  specialties: string[] | null;
  years_experience: number | null;
  is_featured: boolean;
  user_id: string | null;
  start_date: string | null;
  expiration_date: string | null;
  payment_status: string;
  payment_bypassed: boolean;
  license_number: string | null;
  updated_by?: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  location: string | null;
  is_active: boolean;
  updated_by?: string | null;
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
  updated_by?: string | null;
}

interface ConfirmAction {
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
}

const AdminDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Show inactive toggle (per-tab)
  const [showInactive, setShowInactive] = useState(false);

  // Realtor form dialog state
  const [realtorDialogOpen, setRealtorDialogOpen] = useState(false);
  const [realtorDialogMode, setRealtorDialogMode] = useState<"create" | "edit">("create");
  const [selectedRealtor, setSelectedRealtor] = useState<RealtorFormData | null>(null);

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Multi-select
  const [selectedRealtorIds, setSelectedRealtorIds] = useState<Set<string>>(new Set());
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());

  // Create User dialog
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserRole, setCreateUserRole] = useState<"admin" | "realtor" | "user">("user");
  const [newUser, setNewUser] = useState({ email: "", password: "", displayName: "", phone: "", jobTitle: "", location: "", avatarUrl: "" });
  const [uploadingNewUserAvatar, setUploadingNewUserAvatar] = useState(false);
  const newUserAvatarInputRef = useRef<HTMLInputElement>(null);
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchAll = async () => {
    const [r, p, ro, pr] = await Promise.all([
      supabase.from("realtors").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("user_properties").select("id, title, city, state, price, status, listing_type, user_id, updated_by"),
    ]);
    setRealtors(r.data ?? []);
    setProfiles((p.data ?? []) as UserProfile[]);
    setRoles(ro.data ?? []);
    setProperties(pr.data ?? []);
  };

  useEffect(() => {
    if (role === "admin") fetchAll();
  }, [role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || role !== "admin") return <Navigate to="/" replace />;

  const confirm = (action: ConfirmAction) => setConfirmAction(action);

  // Resolve a user_id to a display name/email for the "Updated By" column
  const updatedByLabel = (uid?: string | null) => {
    if (!uid) return "—";
    const p = profiles.find((pr) => pr.user_id === uid);
    return p?.display_name || p?.email || uid.slice(0, 8);
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) { toast.error("Email and password are required"); return; }
    if (newUser.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setCreatingUser(true);
    const ok = await callAdminAction({
      action: "create_user",
      email: newUser.email,
      password: newUser.password,
      displayName: newUser.displayName,
      phone: newUser.phone,
      jobTitle: newUser.jobTitle,
      location: newUser.location,
      avatarUrl: newUser.avatarUrl,
      role: createUserRole,
    });
    setCreatingUser(false);
    if (ok) {
      toast.success(`${createUserRole} account created`);
      setCreateUserOpen(false);
      setNewUser({ email: "", password: "", displayName: "", phone: "", jobTitle: "", location: "", avatarUrl: "" });
      fetchAll();
    }
  };


  // ===== Account actions (via admin-actions edge function) =====
  const callAdminAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-actions", { body });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Action failed");
      return false;
    }
    return true;
  };

  const resetPassword = (profile: UserProfile) => {
    if (!profile.email) { toast.error("No email on file"); return; }
    confirm({
      title: "Send Password Reset",
      description: `Send a password reset email to "${profile.email}"?`,
      onConfirm: async () => {
        const ok = await callAdminAction({ action: "reset_password", email: profile.email });
        if (ok) toast.success("Password reset email sent");
      },
    });
  };

  const toggleActive = (profile: UserProfile) => {
    const action = profile.is_active ? "deactivate" : "activate";
    confirm({
      title: profile.is_active ? "Deactivate Account" : "Activate Account",
      description: `Are you sure you want to ${action} "${profile.display_name || profile.email || "this user"}"?`,
      onConfirm: async () => {
        const ok = await callAdminAction({ action, userId: profile.user_id });
        if (ok) {
          toast.success(`Account ${action}d`);
          setProfiles((prev) => prev.map((p) => p.user_id === profile.user_id ? { ...p, is_active: !profile.is_active } : p));
        }
      },
    });
  };

  const deleteUser = (profile: UserProfile) => {
    confirm({
      title: "Delete User Account",
      description: `Permanently delete "${profile.display_name || profile.email || "this user"}"? This cannot be undone.`,
      onConfirm: async () => {
        const ok = await callAdminAction({ action: "delete_user", userId: profile.user_id });
        if (ok) {
          toast.success("User deleted");
          setProfiles((prev) => prev.filter((p) => p.user_id !== profile.user_id));
          setRoles((prev) => prev.filter((r) => r.user_id !== profile.user_id));
        }
      },
    });
  };

  // ===== Realtor table actions =====
  const toggleFeatured = (realtor: Realtor) => {
    const action = realtor.is_featured ? "unfeature" : "feature";
    confirm({
      title: `${realtor.is_featured ? "Unfeature" : "Feature"} Realtor`,
      description: `Are you sure you want to ${action} "${realtor.name}"?`,
      onConfirm: async () => {
        const { error } = await supabase
          .from("realtors")
          .update({ is_featured: !realtor.is_featured })
          .eq("id", realtor.id);
        if (error) toast.error("Failed to update featured status");
        else {
          toast.success(realtor.is_featured ? "Realtor unfeatured" : "Realtor featured!");
          setRealtors((prev) => prev.map((r) => (r.id === realtor.id ? { ...r, is_featured: !r.is_featured } : r)));
        }
      },
    });
  };

  const deleteRealtor = (id: string) => {
    const realtor = realtors.find((r) => r.id === id);
    confirm({
      title: "Delete Realtor",
      description: `Are you sure you want to delete "${realtor?.name ?? "this realtor"}"? This action cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase.from("realtors").delete().eq("id", id);
        if (error) toast.error("Failed to delete realtor");
        else {
          toast.success("Realtor deleted");
          setRealtors((prev) => prev.filter((r) => r.id !== id));
          setSelectedRealtorIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        }
      },
    });
  };

  const bulkDeleteRealtors = () => {
    if (selectedRealtorIds.size === 0) return;
    confirm({
      title: "Delete Selected Realtors",
      description: `Are you sure you want to delete ${selectedRealtorIds.size} realtor(s)? This action cannot be undone.`,
      onConfirm: async () => {
        const ids = Array.from(selectedRealtorIds);
        const { error } = await supabase.from("realtors").delete().in("id", ids);
        if (error) toast.error("Failed to delete realtors");
        else {
          toast.success(`${ids.length} realtor(s) deleted`);
          setRealtors((prev) => prev.filter((r) => !ids.includes(r.id)));
          setSelectedRealtorIds(new Set());
        }
      },
    });
  };

  const handleOpenCreate = () => {
    setSelectedRealtor(null);
    setRealtorDialogMode("create");
    setRealtorDialogOpen(true);
  };

  const handleOpenEdit = (realtor: Realtor) => {
    setSelectedRealtor({
      id: realtor.id,
      name: realtor.name,
      email: realtor.email ?? "",
      phone: realtor.phone ?? "",
      photo_url: realtor.photo_url ?? "",
      city: realtor.city,
      state: realtor.state,
      district: realtor.district ?? realtor.state,
      bio: realtor.bio ?? "",
      years_experience: realtor.years_experience,
      is_featured: realtor.is_featured,
      start_date: realtor.start_date,
      expiration_date: realtor.expiration_date,
      payment_status: realtor.payment_status ?? "pending",
      payment_bypassed: realtor.payment_bypassed ?? false,
      user_id: realtor.user_id,
      specialties: realtor.specialties,
      license_number: realtor.license_number,
    });
    setRealtorDialogMode("edit");
    setRealtorDialogOpen(true);
  };

  const handleSaveRealtor = async (data: RealtorFormData) => {
    const payload = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      photo_url: data.photo_url || null,
      city: data.city,
      state: data.state || data.district,
      district: data.district || data.state,
      bio: data.bio || null,
      years_experience: data.years_experience,
      is_featured: data.is_featured,
      start_date: data.start_date,
      expiration_date: data.expiration_date,
      payment_status: data.payment_status,
      payment_bypassed: data.payment_bypassed,
      user_id: data.user_id,
      specialties: data.specialties,
      license_number: data.license_number,
    };

    if (realtorDialogMode === "edit" && data.id) {
      confirm({
        title: "Update Realtor",
        description: `Are you sure you want to save changes to "${data.name}"?`,
        onConfirm: async () => {
          const { error } = await supabase.from("realtors").update(payload).eq("id", data.id!);
          if (error) { toast.error("Failed to save realtor"); return; }
          toast.success("Realtor updated");
          setRealtors((prev) => prev.map((r) => (r.id === data.id ? { ...r, ...payload, id: data.id! } : r)));
          setRealtorDialogOpen(false);
        },
      });
    } else {
      const { data: newData, error } = await supabase.from("realtors").insert(payload).select().single();
      if (error) { toast.error("Failed to create realtor"); return; }
      toast.success("Realtor created!");
      setRealtors((prev) => [...prev, newData as Realtor]);
      setRealtorDialogOpen(false);
    }
  };

  const saveProfile = () => {
    if (!editingProfile) return;
    confirm({
      title: "Update User Profile",
      description: `Are you sure you want to save changes to "${editingProfile.display_name || "this user"}"?`,
      onConfirm: async () => {
        const { id, ...rest } = editingProfile;
        const { error } = await supabase.from("profiles").update(rest).eq("id", id);
        if (error) toast.error("Failed to save profile");
        else {
          toast.success("Profile updated");
          setProfiles((prev) => prev.map((p) => (p.id === id ? editingProfile : p)));
          setEditingProfile(null);
        }
      },
    });
  };

  const deleteProperty = (id: string) => {
    const prop = properties.find((p) => p.id === id);
    confirm({
      title: "Delete Property",
      description: `Are you sure you want to delete "${prop?.title ?? "this property"}"? This action cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase.from("user_properties").delete().eq("id", id);
        if (error) toast.error("Failed to delete property");
        else {
          toast.success("Property deleted");
          setProperties((prev) => prev.filter((p) => p.id !== id));
          setSelectedPropertyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        }
      },
    });
  };

  const bulkDeleteProperties = () => {
    if (selectedPropertyIds.size === 0) return;
    confirm({
      title: "Delete Selected Properties",
      description: `Are you sure you want to delete ${selectedPropertyIds.size} property(ies)? This action cannot be undone.`,
      onConfirm: async () => {
        const ids = Array.from(selectedPropertyIds);
        const { error } = await supabase.from("user_properties").delete().in("id", ids);
        if (error) toast.error("Failed to delete properties");
        else {
          toast.success(`${ids.length} property(ies) deleted`);
          setProperties((prev) => prev.filter((p) => !ids.includes(p.id)));
          setSelectedPropertyIds(new Set());
        }
      },
    });
  };

  // Unified list: realtor listings + realtor-role accounts without a listing
  const unifiedRealtors = (() => {
    const q = search.toLowerCase();
    const realtorRoleProfiles = profiles.filter((p) => {
      const ur = roles.find((r) => r.user_id === p.user_id);
      return ur?.role === "realtor";
    });
    const linkedUserIds = new Set(realtors.map((r) => r.user_id).filter(Boolean) as string[]);
    const orphanProfiles = realtorRoleProfiles
      .filter((p) => !linkedUserIds.has(p.user_id))
      .map((p) => ({
        id: `profile-${p.id}`,
        isProfileOnly: true as const,
        profile: p,
        name: p.display_name || p.email || "Unnamed",
        email: p.email,
        phone: p.phone,
        photo_url: p.avatar_url,
        city: p.location || "",
        district: "",
        years_experience: null,
        payment_status: "—",
        start_date: null,
        expiration_date: null,
        is_featured: false,
        updated_by: p.updated_by,
        user_id: p.user_id,
      }));
    const realtorRows = realtors.map((r) => ({ ...r, isProfileOnly: false as const, profile: profiles.find((p) => p.user_id === r.user_id) || null }));
    const all = [...realtorRows, ...orphanProfiles];
    return all.filter((r: any) => {
      const matchSearch =
        !q ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.city || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q);
      if (!matchSearch) return false;
      const profileActive = r.profile ? r.profile.is_active : true;
      const notExpired = !r.expiration_date || new Date(r.expiration_date) >= new Date(new Date().toDateString());
      const isActive = profileActive && notExpired;
      return showInactive ? !isActive : isActive;
    });
  })();
  const filteredRealtors = unifiedRealtors;

  const getProfilesByRole = (target: "admin" | "realtor" | "user") => {
    return profiles.filter((profile) => {
      const userRole = roles.find((r) => r.user_id === profile.user_id);
      const matchRole = target === "user"
        ? (!userRole || userRole.role === "user")
        : userRole?.role === target;
      if (!matchRole) return false;
      const matchActive = showInactive ? !profile.is_active : profile.is_active;
      if (!matchActive) return false;
      if (search) {
        const q = search.toLowerCase();
        return (profile.display_name || "").toLowerCase().includes(q) ||
          (profile.email || "").toLowerCase().includes(q);
      }
      return true;
    });
  };

  const getPaymentBadge = (status: string) => {
    if (status === "paid") return <Badge variant="default">Paid</Badge>;
    if (status === "bypassed") return <Badge variant="secondary">Bypassed</Badge>;
    return <Badge variant="destructive">Pending</Badge>;
  };

  const toggleRealtorSelection = (id: string) => {
    setSelectedRealtorIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAllRealtors = () => {
    if (selectedRealtorIds.size === filteredRealtors.length) setSelectedRealtorIds(new Set());
    else setSelectedRealtorIds(new Set(filteredRealtors.map((r) => r.id)));
  };

  const togglePropertySelection = (id: string) => {
    setSelectedPropertyIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAllProperties = () => {
    if (selectedPropertyIds.size === properties.length) setSelectedPropertyIds(new Set());
    else setSelectedPropertyIds(new Set(properties.map((p) => p.id)));
  };

  // Reusable user-account table
  const renderAccountsTable = (target: "admin" | "realtor" | "user", title: string) => {
    const list = getProfilesByRole(target);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={`Search ${title.toLowerCase()}...`} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
              {showInactive ? "Showing inactive" : "Showing active"}
            </Label>
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
          </div>
          {target === "realtor" && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Create Realtor
            </Button>
          )}
          {target !== "realtor" && (
            <Button
              onClick={() => {
                setCreateUserRole(target);
                setNewUser({ email: "", password: "", displayName: "", phone: "", jobTitle: "", location: "", avatarUrl: "" });
                setCreateUserOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Create {target === "user" ? "Non-Realtor" : "Admin"}
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                {target === "admin" && <TableHead>Job Title</TableHead>}
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (profile.display_name || profile.email || "?").charAt(0).toUpperCase()
                        )}
                      </div>
                      <p className="font-medium text-foreground">{profile.display_name || "Unnamed"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{profile.email || "—"}</TableCell>
                  <TableCell>{profile.phone || "—"}</TableCell>
                  {target === "admin" && <TableCell>{profile.job_title || "—"}</TableCell>}
                  <TableCell>{profile.location || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={profile.is_active ? "default" : "secondary"}>
                      {profile.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{updatedByLabel(profile.updated_by)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditingProfile(profile)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Reset password" onClick={() => resetPassword(profile)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {target !== "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={profile.is_active ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive(profile)}
                        >
                          {profile.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive" title="Delete" onClick={() => deleteUser(profile)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={target === "admin" ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    No {showInactive ? "inactive" : "active"} {title.toLowerCase()} found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-7 w-7 text-accent" />
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="admins" className="space-y-6" onValueChange={() => { setSearch(""); setShowInactive(false); }}>
          <TabsList>
            <TabsTrigger value="admins" className="gap-2"><Shield className="h-4 w-4" /> Admins</TabsTrigger>
            <TabsTrigger value="realtors" className="gap-2"><MapPin className="h-4 w-4" /> Realtors</TabsTrigger>
            <TabsTrigger value="non-realtors" className="gap-2"><User className="h-4 w-4" /> Non-Realtors</TabsTrigger>
            <TabsTrigger value="properties" className="gap-2"><Home className="h-4 w-4" /> Properties</TabsTrigger>
          </TabsList>

          {/* ADMINS TAB */}
          <TabsContent value="admins">
            {renderAccountsTable("admin", "Admins")}
          </TabsContent>

          {/* REALTORS TAB - unified listings */}
          <TabsContent value="realtors" className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search realtors..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Label htmlFor="show-inactive-realtor" className="text-sm text-muted-foreground">
                  {showInactive ? "Showing inactive" : "Showing active"}
                </Label>
                <Switch id="show-inactive-realtor" checked={showInactive} onCheckedChange={setShowInactive} />
              </div>
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Create Realtor
              </Button>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5" /> Realtor Listings
              </h2>
              <p className="text-sm text-muted-foreground">
                {realtors.filter((r) => r.is_featured).length} featured
              </p>
              {selectedRealtorIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={bulkDeleteRealtors} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete {selectedRealtorIds.size} selected
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredRealtors.length > 0 && selectedRealtorIds.size === filteredRealtors.length}
                        onCheckedChange={toggleAllRealtors}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    
                    <TableHead>Payment</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRealtors.map((realtor) => {
                    const linkedProfile = realtor.user_id ? profiles.find((p) => p.user_id === realtor.user_id) : null;
                    const profileActive = linkedProfile ? linkedProfile.is_active : true;
                    const notExpired = !realtor.expiration_date || new Date(realtor.expiration_date) >= new Date(new Date().toDateString());
                    const isActive = profileActive && notExpired;
                    return (
                    <TableRow key={realtor.id} className={selectedRealtorIds.has(realtor.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRealtorIds.has(realtor.id)}
                          onCheckedChange={() => toggleRealtorSelection(realtor.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {realtor.photo_url ? (
                              <img src={realtor.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              realtor.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <p className="font-medium text-foreground">{realtor.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{realtor.email || "—"}</TableCell>
                      <TableCell>{realtor.phone || "—"}</TableCell>
                      <TableCell>{realtor.city}{realtor.district ? `, ${realtor.district}` : ""}</TableCell>
                      
                      <TableCell>{getPaymentBadge(realtor.payment_status)}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <p>{realtor.start_date ? format(new Date(realtor.start_date), "MMM d, yyyy") : "No start"}</p>
                          <p className="text-muted-foreground">{realtor.expiration_date ? format(new Date(realtor.expiration_date), "MMM d, yyyy") : "No expiry"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {realtor.isProfileOnly ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch checked={realtor.is_featured} onCheckedChange={() => toggleFeatured(realtor as Realtor)} />
                            {realtor.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{updatedByLabel(realtor.updated_by)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {realtor.isProfileOnly ? (
                            <Button variant="ghost" size="icon" title="Edit profile" onClick={() => setEditingProfile(realtor.profile!)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(realtor as Realtor)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteRealtor(realtor.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {filteredRealtors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No realtors found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* NON-REALTORS TAB */}
          <TabsContent value="non-realtors">
            {renderAccountsTable("user", "Non-Realtors")}
          </TabsContent>

          {/* PROPERTIES TAB */}
          <TabsContent value="properties" className="space-y-4">
            <div className="flex items-center gap-2">
              {selectedPropertyIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={bulkDeleteProperties} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete {selectedPropertyIds.size} selected
                </Button>
              )}
              <Button onClick={() => navigate("/list-property")} className="gap-2 ml-auto">
                <Plus className="h-4 w-4" /> Create Property
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={properties.length > 0 && selectedPropertyIds.size === properties.length}
                        onCheckedChange={toggleAllProperties}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((prop) => (
                    <TableRow key={prop.id} className={selectedPropertyIds.has(prop.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPropertyIds.has(prop.id)}
                          onCheckedChange={() => togglePropertySelection(prop.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{prop.title}</TableCell>
                      <TableCell>{prop.city}</TableCell>
                      <TableCell>Rs. {prop.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={prop.status === "active" ? "default" : "secondary"}>{prop.status}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{prop.listing_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{updatedByLabel(prop.updated_by)}</TableCell>
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
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No properties found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

      {/* Realtor Create/Edit Dialog */}
      <RealtorFormDialog
        open={realtorDialogOpen}
        onOpenChange={setRealtorDialogOpen}
        realtor={selectedRealtor}
        onSave={handleSaveRealtor}
        mode={realtorDialogMode}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <div className="space-y-4">
              {/* Avatar Upload */}
              <div>
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {editingProfile.avatar_url ? (
                      <img src={editingProfile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
                        if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
                        setUploadingAvatar(true);
                        const ext = file.name.split(".").pop();
                        const filePath = `${editingProfile.user_id}/avatar.${ext}`;
                        await supabase.storage.from("realtor-photos").remove([filePath]);
                        const { error } = await supabase.storage.from("realtor-photos").upload(filePath, file, { upsert: true });
                        if (error) { toast.error("Failed to upload photo"); setUploadingAvatar(false); return; }
                        const { data: urlData } = supabase.storage.from("realtor-photos").getPublicUrl(filePath);
                        setEditingProfile({ ...editingProfile, avatar_url: urlData.publicUrl });
                        toast.success("Photo uploaded!");
                        setUploadingAvatar(false);
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()} className="gap-2">
                      {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 5MB.</p>
                  </div>
                </div>
              </div>
              <div>
                <Label>Display Name</Label>
                <Input value={editingProfile.display_name ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, display_name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editingProfile.email ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editingProfile.phone ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })} />
              </div>
              <div>
                <Label>Job Title</Label>
                <Input value={editingProfile.job_title ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, job_title: e.target.value })} placeholder="e.g. Senior Agent" />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={editingProfile.location ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, location: e.target.value })} placeholder="e.g. Kathmandu" />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label className="text-sm">Account Status</Label>
                  <p className="text-xs text-muted-foreground">{editingProfile.is_active ? "Active" : "Inactive"}</p>
                </div>
                <Switch
                  checked={editingProfile.is_active}
                  onCheckedChange={(checked) => setEditingProfile({ ...editingProfile, is_active: checked })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
                <Button onClick={saveProfile}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Create {createUserRole === "user" ? "Non-Realtor" : createUserRole.charAt(0).toUpperCase() + createUserRole.slice(1)} Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {createUserRole === "user" && (
              <div>
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {newUser.avatarUrl ? (
                      <img src={newUser.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      ref={newUserAvatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
                        if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
                        setUploadingNewUserAvatar(true);
                        const ext = file.name.split(".").pop();
                        const filePath = `new-${Date.now()}/avatar.${ext}`;
                        const { error } = await supabase.storage.from("realtor-photos").upload(filePath, file, { upsert: true });
                        if (error) { toast.error("Failed to upload photo"); setUploadingNewUserAvatar(false); return; }
                        const { data: urlData } = supabase.storage.from("realtor-photos").getPublicUrl(filePath);
                        setNewUser({ ...newUser, avatarUrl: urlData.publicUrl });
                        toast.success("Photo uploaded!");
                        setUploadingNewUserAvatar(false);
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={uploadingNewUserAvatar} onClick={() => newUserAvatarInputRef.current?.click()} className="gap-2">
                      {uploadingNewUserAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {uploadingNewUserAvatar ? "Uploading..." : "Upload Photo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 5MB.</p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <Label>{createUserRole === "user" ? "Name" : "Display Name"}</Label>
              <Input value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@example.com" />
            </div>
            <div>
              <Label>Temporary Password *</Label>
              <Input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min. 6 characters" />
              <p className="text-xs text-muted-foreground mt-1">User can reset it later via password recovery.</p>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="e.g. 98XXXXXXXX" />
            </div>
            {createUserRole !== "user" && (
              <div>
                <Label>Job Title</Label>
                <Input value={newUser.jobTitle} onChange={(e) => setNewUser({ ...newUser, jobTitle: e.target.value })} placeholder="e.g. Senior Agent" />
              </div>
            )}
            <div>
              <Label>Location</Label>
              <Input value={newUser.location} onChange={(e) => setNewUser({ ...newUser, location: e.target.value })} placeholder="e.g. Kathmandu" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateUserOpen(false)} disabled={creatingUser}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={creatingUser} className="gap-2">
                {creatingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await confirmAction?.onConfirm();
                setConfirmAction(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
