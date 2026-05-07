import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
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
import { Search, Star, Pencil, Trash2, Shield, Users, Home, MapPin, Plus, Camera, Loader2, KeyRound, UserCheck, UserX, User, ArrowUpDown, ArrowUp, ArrowDown, Sliders, ChevronDown, ChevronRight } from "lucide-react";
import FeaturesTab from "@/components/admin/FeaturesTab";
import PaymentHistoryList from "@/components/PaymentHistoryList";
import ConfirmSaveButton from "@/components/ConfirmSaveButton";
import { toast } from "sonner";
import { format } from "date-fns";
import RealtorFormDialog, { type RealtorFormData } from "@/components/admin/RealtorFormDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NEPAL_CITIES, NEPAL_DISTRICTS, getDistrictForCity } from "@/data/nepalLocations";

const parseLocation = (loc: string | null | undefined): { city: string; district: string } => {
  if (!loc) return { city: "", district: "" };
  const [city = "", district = ""] = loc.split(",").map((s) => s.trim());
  return { city, district };
};
const joinLocation = (city: string, district: string) => [city, district].filter(Boolean).join(", ");

interface Realtor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  city: string;
  state: string;
  district: string;
  street_address: string | null;
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
  featured_start_date: string | null;
  featured_expiration_date: string | null;
  featured_payment_status: string | null;
  featured_payment_bypassed: boolean;
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
  street_address: string | null;
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
  property_code?: number | null;
  title: string;
  city: string;
  district?: string;
  state: string;
  price: number;
  status: string;
  listing_type: string;
  user_id: string;
  expiration_date?: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "admins";
  const [realtors, setRealtors] = useState<Realtor[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [editingProfile, setEditingProfileState] = useState<UserProfile | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const setEditingProfile = (next: UserProfile | null) => {
    setEditingProfileState((prev) => {
      if (next === null || prev === null) setProfileDirty(false);
      else setProfileDirty(true);
      return next;
    });
  };
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

  // Expanded rows state (no longer used — detail pages handle this)

  // Per-tab sorting
  const [sortConfig, setSortConfig] = useState<Record<string, { key: string; dir: 'asc' | 'desc' } | null>>({});
  const getSort = (tab: string) => sortConfig[tab] ?? null;
  const toggleSort = (tab: string, key: string) => {
    setSortConfig((prev) => {
      const cur = prev[tab];
      let next: { key: string; dir: 'asc' | 'desc' } | null;
      if (!cur || cur.key !== key) next = { key, dir: 'asc' };
      else if (cur.dir === 'asc') next = { key, dir: 'desc' };
      else next = null;
      return { ...prev, [tab]: next };
    });
  };
  const SortHeader = ({ tab, sortKey, children, className }: { tab: string; sortKey: string; children: React.ReactNode; className?: string }) => {
    const cur = getSort(tab);
    const active = cur?.key === sortKey;
    const Icon = !active ? ArrowUpDown : cur!.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className}>
        <button type="button" onClick={() => toggleSort(tab, sortKey)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          {children}
          <Icon className={`h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground/60'}`} />
        </button>
      </TableHead>
    );
  };
  const sortList = <T,>(list: T[], tab: string, accessors: Record<string, (item: T) => any>): T[] => {
    const cur = getSort(tab);
    if (!cur || !accessors[cur.key]) return list;
    const acc = accessors[cur.key];
    const dir = cur.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = acc(a); const bv = acc(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  };

  // Create User dialog
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserRole, setCreateUserRole] = useState<"admin" | "realtor" | "user">("user");
  const [newUser, setNewUser] = useState({ email: "", password: "", displayName: "", phone: "", jobTitle: "", streetAddress: "", location: "", avatarUrl: "" });
  const [uploadingNewUserAvatar, setUploadingNewUserAvatar] = useState(false);
  const newUserAvatarInputRef = useRef<HTMLInputElement>(null);
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchAll = async () => {
    const [r, p, ro, pr] = await Promise.all([
      supabase.from("realtors").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("user_properties").select("id, property_code, title, city, district, state, price, status, listing_type, user_id, updated_by, expiration_date"),
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

  const creatorEmail = (uid?: string | null) => {
    if (!uid) return "—";
    const p = profiles.find((pr) => pr.user_id === uid);
    return p?.email || "—";
  };

  const handleCreateUser = async () => {
    if (!newUser.displayName.trim()) { toast.error("Name is required"); return; }
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
      streetAddress: newUser.streetAddress,
      location: newUser.location,
      avatarUrl: newUser.avatarUrl,
      role: createUserRole,
    });
    setCreatingUser(false);
    if (ok) {
      toast.success(`${createUserRole} account created`);
      setCreateUserOpen(false);
      setNewUser({ email: "", password: "", displayName: "", phone: "", jobTitle: "", streetAddress: "", location: "", avatarUrl: "" });
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
      title: "Delete user account?",
      description: `This will permanently delete "${profile.display_name || profile.email || "this user"}". This action cannot be undone.`,
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
    const turningOn = !realtor.is_featured;
    const action = turningOn ? "feature" : "unfeature";
    confirm({
      title: `${turningOn ? "Feature" : "Unfeature"} Realtor`,
      description: `Are you sure you want to ${action} "${realtor.name}"?`,
      onConfirm: async () => {
        const today = new Date().toISOString().split("T")[0];
        const exp = new Date(); exp.setMonth(exp.getMonth() + 1);
        const expStr = exp.toISOString().split("T")[0];
        const updates: any = turningOn
          ? {
              is_featured: true,
              featured_start_date: today,
              featured_expiration_date: expStr,
              featured_payment_status: "bypassed",
              featured_payment_bypassed: true,
            }
          : { is_featured: false };
        const { error } = await supabase.from("realtors").update(updates).eq("id", realtor.id);
        if (error) { toast.error("Failed to update featured status"); return; }
        toast.success(turningOn ? "Realtor featured!" : "Realtor unfeatured");
        setRealtors((prev) => prev.map((r) => (r.id === realtor.id ? { ...r, ...updates } : r)));
        if (turningOn) {
          const { logPayment } = await import("@/lib/paymentHistory");
          const { FEATURE_KEYS } = await import("@/hooks/useFeatureFlag");
          const { data: { user: actor } } = await supabase.auth.getUser();
          await logPayment({
            user_id: realtor.user_id ?? actor!.id,
            service_key: FEATURE_KEYS.FEATURED_REALTOR,
            service_label: "Featured Realtor",
            related_type: "realtor",
            related_id: realtor.id,
            related_label: realtor.name,
            amount: 0,
            status: "bypassed",
            expiration_date: new Date(expStr).toISOString(),
            notes: "Featured toggled on by admin (no payment).",
          });
        }
      },
    });
  };

  const deleteRealtor = (id: string) => {
    const realtor = realtors.find((r) => r.id === id);
    confirm({
      title: "Delete realtor?",
      description: `This will permanently delete "${realtor?.name ?? "this realtor"}". This action cannot be undone.`,
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
      title: "Delete selected realtors?",
      description: `This will permanently delete ${selectedRealtorIds.size} realtor(s). This action cannot be undone.`,
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
      street_address: realtor.street_address ?? "",
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
      featured_start_date: realtor.featured_start_date ?? null,
      featured_expiration_date: realtor.featured_expiration_date ?? null,
      featured_payment_status: realtor.featured_payment_status ?? "none",
      featured_payment_bypassed: realtor.featured_payment_bypassed ?? false,
      featured_bypass_reason: null,
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
      street_address: data.street_address || null,
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
      featured_start_date: data.featured_start_date,
      featured_expiration_date: data.featured_expiration_date,
      featured_payment_status: data.featured_payment_status,
      featured_payment_bypassed: data.featured_payment_bypassed,
    };

    const { logPayment } = await import("@/lib/paymentHistory");
    const { FEATURE_KEYS } = await import("@/hooks/useFeatureFlag");
    const isCreate = realtorDialogMode === "create";
    const flagKey = isCreate ? FEATURE_KEYS.REALTOR_SIGNUP : FEATURE_KEYS.REALTOR_RENEWAL;
    const { data: flagRow } = await supabase.from("feature_flags").select("*").eq("key", flagKey).maybeSingle();
    const flagFee = Number(flagRow?.fee ?? 0);
    const promoActive = !!flagRow?.bypass_payment && (!flagRow?.promo_ends_at || new Date(flagRow.promo_ends_at).getTime() > Date.now());
    const status: "paid" | "bypassed" | "promotion" =
      data.payment_status === "paid" ? "paid" :
      promoActive ? "promotion" :
      "bypassed";
    const amount = status === "paid" ? flagFee : 0;

    // Determine if a featured payment log is needed (newly activated or renewed)
    const original = realtors.find((r) => r.id === data.id);
    const featuredChanged =
      data.is_featured && (
        !original?.is_featured ||
        (original?.featured_expiration_date ?? null) !== (data.featured_expiration_date ?? null)
      );
    const { data: featFlag } = await supabase.from("feature_flags").select("*").eq("key", FEATURE_KEYS.FEATURED_REALTOR).maybeSingle();
    const featFee = Number(featFlag?.fee ?? 0);
    const featPromoActive = !!featFlag?.bypass_payment && (!featFlag?.promo_ends_at || new Date(featFlag.promo_ends_at).getTime() > Date.now());
    const featStatus: "paid" | "bypassed" | "promotion" =
      data.featured_payment_status === "paid" ? "paid" :
      featPromoActive ? "promotion" :
      "bypassed";
    const featAmount = featStatus === "paid" ? featFee : 0;
    const logFeatured = async (relatedId: string, relatedLabel: string, userId: string) => {
      if (!featuredChanged) return;
      await logPayment({
        user_id: userId,
        service_key: FEATURE_KEYS.FEATURED_REALTOR,
        service_label: "Featured Realtor",
        related_type: "realtor",
        related_id: relatedId,
        related_label: relatedLabel,
        amount: featAmount,
        status: featStatus,
        promo_label: featPromoActive ? featFlag?.promo_label : null,
        expiration_date: data.featured_expiration_date ? new Date(data.featured_expiration_date).toISOString() : null,
        notes: featStatus === "bypassed"
          ? `Featured payment bypassed by admin. Reason: ${data.featured_bypass_reason?.trim() || "(no reason provided)"}`
          : null,
      });
    };

    if (realtorDialogMode === "edit" && data.id) {
      confirm({
        title: "Update Realtor",
        description: `Are you sure you want to save changes to "${data.name}"?`,
        onConfirm: async () => {
          const { error } = await supabase.from("realtors").update(payload).eq("id", data.id!);
          if (error) { toast.error("Failed to save realtor"); return; }
          {
            const { data: { user: actor } } = await supabase.auth.getUser();
            await logPayment({
              user_id: data.user_id ?? actor!.id,
              service_key: flagKey,
              service_label: isCreate ? "Realtor Signup" : "Realtor Renewal",
              related_type: "realtor",
              related_id: data.id,
              related_label: data.name,
              amount,
              status,
              promo_label: promoActive ? flagRow?.promo_label : null,
              expiration_date: data.expiration_date ? new Date(data.expiration_date).toISOString() : null,
              notes: status === "bypassed"
                ? `Payment bypassed by admin. Reason: ${data.bypass_reason?.trim() || "(no reason provided)"}`
                : null,
            });
            await logFeatured(data.id!, data.name, data.user_id ?? actor!.id);
          }
          toast.success("Realtor updated");
          setRealtors((prev) => prev.map((r) => (r.id === data.id ? { ...r, ...payload, id: data.id! } : r)));
          setRealtorDialogOpen(false);
        },
      });
    } else {
      const { data: newData, error } = await supabase.from("realtors").insert(payload).select().single();
      if (error) { toast.error("Failed to create realtor"); return; }
      {
        const { data: { user: actor } } = await supabase.auth.getUser();
        await logPayment({
          user_id: newData?.user_id ?? actor!.id,
          service_key: flagKey,
          service_label: "Realtor Signup",
          related_type: "realtor",
          related_id: newData.id,
          related_label: newData.name,
          amount,
          status,
          promo_label: promoActive ? flagRow?.promo_label : null,
          expiration_date: newData.expiration_date ? new Date(newData.expiration_date).toISOString() : null,
          notes: status === "bypassed"
            ? `Payment bypassed by admin. Reason: ${data.bypass_reason?.trim() || "(no reason provided)"}`
            : null,
        });
        await logFeatured(newData.id, newData.name, newData?.user_id ?? actor!.id);
      }
      toast.success("Realtor created!");
      setRealtors((prev) => [...prev, newData as Realtor]);
      setRealtorDialogOpen(false);
    }
  };

  const saveProfile = async () => {
    if (!editingProfile) return;
    if (!editingProfile.display_name?.trim()) { toast.error("Name is required"); return; }
    if (!editingProfile.email?.trim()) { toast.error("Email is required"); return; }
    const { id, ...rest } = editingProfile;
    const { error } = await supabase.from("profiles").update(rest).eq("id", id);
    if (error) toast.error("Failed to save profile");
    else {
      toast.success("Profile updated");
      setProfiles((prev) => prev.map((p) => (p.id === id ? editingProfile : p)));
      setProfileDirty(false);
      setEditingProfileState(null);
    }
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
  const filteredRealtors = sortList(unifiedRealtors as any[], 'realtors', {
    name: (r) => (r.name || '').toLowerCase(),
    email: (r) => (r.email || '').toLowerCase(),
    phone: (r) => r.phone || '',
    location: (r) => `${r.city || ''} ${r.district || ''}`.toLowerCase(),
    payment: (r) => r.payment_status || '',
    start_date: (r) => r.start_date ? new Date(r.start_date).getTime() : null,
    expiration_date: (r) => r.expiration_date ? new Date(r.expiration_date).getTime() : null,
    status: (r) => {
      const profileActive = r.profile ? r.profile.is_active : true;
      const notExpired = !r.expiration_date || new Date(r.expiration_date) >= new Date(new Date().toDateString());
      return (profileActive && notExpired) ? 1 : 0;
    },
    featured: (r) => r.is_featured ? 1 : 0,
    updated_by: (r) => updatedByLabel(r.updated_by).toLowerCase(),
  });

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
    const rawList = getProfilesByRole(target);
    const list = sortList(rawList, target, {
      name: (p) => (p.display_name || '').toLowerCase(),
      email: (p) => (p.email || '').toLowerCase(),
      phone: (p) => p.phone || '',
      job_title: (p) => (p.job_title || '').toLowerCase(),
      location: (p) => { const l = parseLocation(p.location); return `${l.city} ${l.district}`.toLowerCase(); },
      status: (p) => (p.is_active ? 1 : 0),
      updated_by: (p) => updatedByLabel(p.updated_by).toLowerCase(),
    });
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
                setNewUser({ email: "", password: "", displayName: "", phone: "", jobTitle: "", streetAddress: "", location: "", avatarUrl: "" });
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
                <SortHeader tab={target} sortKey="name">Name</SortHeader>
                <SortHeader tab={target} sortKey="email">Email</SortHeader>
                <SortHeader tab={target} sortKey="phone">Phone</SortHeader>
                {target === "admin" && <SortHeader tab={target} sortKey="job_title">Job Title</SortHeader>}
                <SortHeader tab={target} sortKey="location">City / District</SortHeader>
                <SortHeader tab={target} sortKey="status">Status</SortHeader>
                <SortHeader tab={target} sortKey="updated_by">Updated By</SortHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((profile) => (
                <TableRow
                  key={profile.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => navigate(`/admin/user/${profile.user_id}`)}
                >
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
                  <TableCell>{(() => { const l = parseLocation(profile.location); return [l.city, l.district].filter(Boolean).join(", ") || "—"; })()}</TableCell>
                  <TableCell>
                    <Badge variant={profile.is_active ? "default" : "secondary"}>
                      {profile.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{updatedByLabel(profile.updated_by)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="text-destructive" title="Delete" onClick={() => deleteUser(profile)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

        <Tabs value={initialTab} className="space-y-6" onValueChange={(v) => { setSearch(""); setShowInactive(false); setSearchParams({ tab: v }); }}>
          <TabsList>
            <TabsTrigger value="admins" className="gap-2"><Shield className="h-4 w-4" /> Admins</TabsTrigger>
            <TabsTrigger value="realtors" className="gap-2"><MapPin className="h-4 w-4" /> Realtors</TabsTrigger>
            <TabsTrigger value="non-realtors" className="gap-2"><User className="h-4 w-4" /> Non-Realtors</TabsTrigger>
            <TabsTrigger value="properties" className="gap-2"><Home className="h-4 w-4" /> Properties</TabsTrigger>
            <TabsTrigger value="features" className="gap-2"><Sliders className="h-4 w-4" /> Features</TabsTrigger>
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


            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader tab="realtors" sortKey="name">Name</SortHeader>
                    <SortHeader tab="realtors" sortKey="email">Email</SortHeader>
                    <SortHeader tab="realtors" sortKey="phone">Phone</SortHeader>
                    <SortHeader tab="realtors" sortKey="location">City / District</SortHeader>
                    <SortHeader tab="realtors" sortKey="payment">Payment</SortHeader>
                    <SortHeader tab="realtors" sortKey="expiration_date">Dates</SortHeader>
                    <SortHeader tab="realtors" sortKey="status">Status</SortHeader>
                    <SortHeader tab="realtors" sortKey="featured">Featured</SortHeader>
                    <SortHeader tab="realtors" sortKey="updated_by">Updated By</SortHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRealtors.map((realtor) => {
                    const linkedProfile = realtor.user_id ? profiles.find((p) => p.user_id === realtor.user_id) : null;
                    const profileActive = linkedProfile ? linkedProfile.is_active : true;
                    const notExpired = !realtor.expiration_date || new Date(realtor.expiration_date) >= new Date(new Date().toDateString());
                    const isActive = profileActive && notExpired;
                    const targetUrl = realtor.isProfileOnly
                      ? `/admin/user/${realtor.user_id}`
                      : `/admin/realtor/${realtor.id}`;
                    return (
                    <TableRow key={realtor.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(targetUrl)}>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {!realtor.isProfileOnly && (
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteRealtor(realtor.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {filteredRealtors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No realtors found</TableCell>
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
            {(() => {
              const q = search.trim().toLowerCase().replace(/^#/, '');
              const baseFiltered = properties.filter((p) => {
                const notExpired = !p.expiration_date || new Date(p.expiration_date) >= new Date(new Date().toDateString());
                const isActive = p.status === "active" && notExpired;
                if (showInactive ? isActive : !isActive) return false;
                if (!q) return true;
                const code = String((p as any).property_code ?? '');
                const email = creatorEmail(p.user_id).toLowerCase();
                return code.includes(q) || email.includes(q);
              });
              const filteredProperties = sortList(baseFiltered, 'properties', {
                property_code: (p) => p.property_code ?? null,
                title: (p) => (p.title || '').toLowerCase(),
                location: (p) => `${p.city || ''} ${p.district || ''}`.toLowerCase(),
                price: (p) => Number(p.price) || 0,
                status: (p) => {
                  const expired = p.expiration_date && new Date(p.expiration_date) < new Date(new Date().toDateString());
                  return expired ? 'expired' : p.status;
                },
                listing_type: (p) => p.listing_type || '',
                updated_by: (p) => updatedByLabel(p.updated_by).toLowerCase(),
                creator_email: (p) => creatorEmail(p.user_id).toLowerCase(),
              });
              return (
            <>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Property ID or creator email..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {selectedPropertyIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={bulkDeleteProperties} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete {selectedPropertyIds.size} selected
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Label htmlFor="show-inactive-property" className="text-sm text-muted-foreground">
                  {showInactive ? "Showing inactive" : "Showing active"}
                </Label>
                <Switch id="show-inactive-property" checked={showInactive} onCheckedChange={setShowInactive} />
              </div>
              <Button onClick={() => navigate("/list-property")} className="gap-2">
                <Plus className="h-4 w-4" /> Create Property
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredProperties.length > 0 && selectedPropertyIds.size === filteredProperties.length}
                        onCheckedChange={() => {
                          if (selectedPropertyIds.size === filteredProperties.length) setSelectedPropertyIds(new Set());
                          else setSelectedPropertyIds(new Set(filteredProperties.map((p) => p.id)));
                        }}
                      />
                    </TableHead>
                    <SortHeader tab="properties" sortKey="property_code">Property ID</SortHeader>
                    <SortHeader tab="properties" sortKey="title">Title</SortHeader>
                    <SortHeader tab="properties" sortKey="location">City / District</SortHeader>
                    <SortHeader tab="properties" sortKey="price">Price</SortHeader>
                    <SortHeader tab="properties" sortKey="status">Status</SortHeader>
                    <SortHeader tab="properties" sortKey="listing_type">Type</SortHeader>
                    <SortHeader tab="properties" sortKey="creator_email">Created By (Email)</SortHeader>
                    <SortHeader tab="properties" sortKey="updated_by">Updated By</SortHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((prop) => {
                    const expired = prop.expiration_date && new Date(prop.expiration_date) < new Date(new Date().toDateString());
                    const isActive = prop.status === "active" && !expired;
                    return (
                    <TableRow
                      key={prop.id}
                      className={`cursor-pointer hover:bg-muted/40 ${selectedPropertyIds.has(prop.id) ? "bg-muted/50" : ""}`}
                      onClick={() => navigate(`/admin/property/${prop.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedPropertyIds.has(prop.id)}
                          onCheckedChange={() => togglePropertySelection(prop.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{(prop as any).property_code ?? '—'}</TableCell>
                      <TableCell className="font-medium text-foreground">{prop.title}</TableCell>
                      <TableCell>{[prop.city, prop.district].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell>Rs. {prop.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>{expired ? "expired" : prop.status}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{prop.listing_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{creatorEmail(prop.user_id)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{updatedByLabel(prop.updated_by)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteProperty(prop.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {filteredProperties.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No properties found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            </>
              );
            })()}
          </TabsContent>

          {/* FEATURES TAB */}
          <TabsContent value="features">
            <FeaturesTab />
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
              {(() => {
                const editingRole = roles.find((r) => r.user_id === editingProfile.user_id)?.role;
                const nameLabel = editingRole === "admin" ? "Display Name *" : "Name *";
                return (
                  <div>
                    <Label>{nameLabel}</Label>
                    <Input value={editingProfile.display_name ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, display_name: e.target.value })} />
                  </div>
                );
              })()}
              <div>
                <Label>Email *</Label>
                <Input value={editingProfile.email ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editingProfile.phone ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })} />
              </div>
              {roles.find((r) => r.user_id === editingProfile.user_id)?.role === "admin" && (
                <div>
                  <Label>Job Title</Label>
                  <Input value={editingProfile.job_title ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, job_title: e.target.value })} placeholder="e.g. Senior Agent" />
                </div>
              )}
              <div>
                <Label>Street Address</Label>
                <Input value={editingProfile.street_address ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, street_address: e.target.value })} placeholder="e.g. Thamel, Ward No. 26" />
              </div>
              {(() => {
                const editingRole = roles.find((r) => r.user_id === editingProfile.user_id)?.role ?? "user";
                if (editingRole === "realtor") return null;
                const loc = parseLocation(editingProfile.location);
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Select
                        value={loc.city}
                        onValueChange={(city) => {
                          const district = getDistrictForCity(city) || loc.district;
                          setEditingProfile({ ...editingProfile, location: joinLocation(city, district) });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                        <SelectContent>
                          {NEPAL_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>District</Label>
                      <Select
                        value={loc.district}
                        onValueChange={(district) => {
                          const cityDist = getDistrictForCity(loc.city);
                          const nextCity = cityDist && cityDist !== district ? "" : loc.city;
                          setEditingProfile({ ...editingProfile, location: joinLocation(nextCity, district) });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                        <SelectContent>
                          {NEPAL_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })()}
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
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="font-semibold text-foreground">Payment History</h3>
                <PaymentHistoryList userId={editingProfile.user_id} canEditNotes compact />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
                <ConfirmSaveButton onConfirm={saveProfile} disabled={!profileDirty}>Save Changes</ConfirmSaveButton>
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
              <Label>{createUserRole === "user" ? "Name *" : "Display Name *"}</Label>
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
              <Label>Street Address</Label>
              <Input value={newUser.streetAddress} onChange={(e) => setNewUser({ ...newUser, streetAddress: e.target.value })} placeholder="e.g. Thamel, Ward No. 26" />
            </div>
            {(() => {
              const loc = parseLocation(newUser.location);
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Select
                      value={loc.city}
                      onValueChange={(city) => {
                        const district = getDistrictForCity(city) || loc.district;
                        setNewUser({ ...newUser, location: joinLocation(city, district) });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                      <SelectContent>
                        {NEPAL_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>District</Label>
                    <Select
                      value={loc.district}
                      onValueChange={(district) => {
                        const cityDist = getDistrictForCity(loc.city);
                        const nextCity = cityDist && cityDist !== district ? "" : loc.city;
                        setNewUser({ ...newUser, location: joinLocation(nextCity, district) });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                      <SelectContent>
                        {NEPAL_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })()}
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
