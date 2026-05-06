import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaymentHistoryList from "@/components/PaymentHistoryList";
import RealtorFormDialog, { type RealtorFormData } from "@/components/admin/RealtorFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, KeyRound, Trash2, Star, Home, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logPayment } from "@/lib/paymentHistory";
import { FEATURE_KEYS } from "@/hooks/useFeatureFlag";

const AdminRealtorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [realtor, setRealtor] = useState<any>(null);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [propertiesMatchedByEmail, setPropertiesMatchedByEmail] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; description: string; onConfirm: () => Promise<void> | void } | null>(null);

  const fetchRealtor = async () => {
    if (!id) return;
    const { data } = await supabase.from("realtors").select("*").eq("id", id).maybeSingle();
    setRealtor(data);
    if (!data) return;

    let effectiveUserId: string | null = data.user_id ?? null;
    let matchedByEmail = false;

    if (effectiveUserId) {
      const { data: p } = await supabase.from("profiles").select("email").eq("user_id", effectiveUserId).maybeSingle();
      setLinkedEmail(p?.email ?? null);
    } else if (data.email) {
      // Fallback: try to resolve a profile by the realtor's email
      const { data: p } = await supabase.from("profiles").select("user_id, email").ilike("email", data.email).maybeSingle();
      if (p?.user_id) {
        effectiveUserId = p.user_id;
        matchedByEmail = true;
        setLinkedEmail(p.email);
        // Self-heal: persist the link so the trigger-style relationship is maintained
        await supabase.from("realtors").update({ user_id: p.user_id }).eq("id", data.id);
      } else {
        setLinkedEmail(null);
      }
    } else {
      setLinkedEmail(null);
    }

    setPropertiesMatchedByEmail(matchedByEmail);

    if (effectiveUserId) {
      const { data: props } = await supabase
        .from("user_properties")
        .select("id, title, city, district, listing_type, price, status, expiration_date")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });
      setProperties(props ?? []);
    } else {
      setProperties([]);
    }
  };

  useEffect(() => { if (role === "admin") fetchRealtor(); /* eslint-disable-next-line */ }, [id, role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user || role !== "admin") return <Navigate to="/" replace />;

  const callAdminAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-actions", { body });
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "Action failed"); return false; }
    return true;
  };

  const handleResetPassword = () => {
    const email = linkedEmail || realtor?.email;
    if (!email) { toast.error("No email on file"); return; }
    setConfirm({
      title: "Send Password Reset",
      description: `Send a password reset email to "${email}"?`,
      onConfirm: async () => {
        const ok = await callAdminAction({ action: "reset_password", email });
        if (ok) toast.success("Password reset email sent");
      },
    });
  };

  const handleDelete = () => {
    setConfirm({
      title: "Delete Realtor",
      description: `Are you sure you want to delete "${realtor?.name}"? This cannot be undone.`,
      onConfirm: async () => {
        const { error } = await supabase.from("realtors").delete().eq("id", id!);
        if (error) toast.error("Failed to delete realtor");
        else { toast.success("Realtor deleted"); navigate("/admin?tab=realtors"); }
      },
    });
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
    const { data: flagRow } = await supabase.from("feature_flags").select("*").eq("key", FEATURE_KEYS.REALTOR_RENEWAL).maybeSingle();
    const flagFee = Number(flagRow?.fee ?? 0);
    const promoActive = !!flagRow?.bypass_payment && (!flagRow?.promo_ends_at || new Date(flagRow.promo_ends_at).getTime() > Date.now());
    const status: "paid" | "bypassed" | "promotion" =
      data.payment_status === "paid" ? "paid" : promoActive ? "promotion" : "bypassed";
    const amount = status === "paid" ? flagFee : 0;

    const { error } = await supabase.from("realtors").update(payload).eq("id", data.id!);
    if (error) { toast.error("Failed to save realtor"); return; }
    const { data: { user: actor } } = await supabase.auth.getUser();
    await logPayment({
      user_id: data.user_id ?? actor!.id,
      service_key: FEATURE_KEYS.REALTOR_RENEWAL,
      service_label: "Realtor Renewal",
      related_type: "realtor",
      related_id: data.id!,
      related_label: data.name,
      amount,
      status,
      promo_label: promoActive ? flagRow?.promo_label : null,
      expiration_date: data.expiration_date ? new Date(data.expiration_date).toISOString() : null,
      notes: status === "bypassed" ? `Payment bypassed by admin. Reason: ${data.bypass_reason?.trim() || "(no reason provided)"}` : null,
    });
    toast.success("Realtor updated");
    setEditOpen(false);
    fetchRealtor();
  };

  if (!realtor) {
    return (
      <div className="min-h-screen flex flex-col"><Header /><main className="flex-1 container py-8">Loading…</main><Footer /></div>
    );
  }

  const formData: RealtorFormData = {
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
  };

  const notExpired = !realtor.expiration_date || new Date(realtor.expiration_date) >= new Date(new Date().toDateString());

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 max-w-4xl space-y-6">
        <Link to="/admin?tab=realtors" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Realtors
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xl font-bold text-muted-foreground">
                  {realtor.photo_url ? <img src={realtor.photo_url} alt="" className="h-full w-full object-cover" /> : realtor.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {realtor.name}
                    {realtor.is_featured && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={notExpired ? "default" : "secondary"}>{notExpired ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline" className="capitalize">Payment: {realtor.payment_status}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleResetPassword}><KeyRound className="h-4 w-4" /> Reset Password</Button>
                <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={handleDelete}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{realtor.email || "—"}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{realtor.phone || "—"}</span></div>
            <div><span className="text-muted-foreground">City / District:</span> <span className="text-foreground">{realtor.city}{realtor.district ? `, ${realtor.district}` : ""}</span></div>
            <div><span className="text-muted-foreground">License #:</span> <span className="text-foreground">{realtor.license_number || "—"}</span></div>
            <div><span className="text-muted-foreground">Years Experience:</span> <span className="text-foreground">{realtor.years_experience ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Subscription:</span> <span className="text-foreground">{realtor.start_date ? format(new Date(realtor.start_date), "MMM d, yyyy") : "—"} → {realtor.expiration_date ? format(new Date(realtor.expiration_date), "MMM d, yyyy") : "—"}</span></div>
            {realtor.bio && <div className="sm:col-span-2"><span className="text-muted-foreground">Bio:</span> <span className="text-foreground">{realtor.bio}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5" /> Listed Properties ({properties.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {propertiesMatchedByEmail && (
              <p className="text-xs text-muted-foreground mb-3">Auto-matched by email.</p>
            )}
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {realtor.email
                  ? <>No listings yet. When this realtor signs up with <span className="font-medium text-foreground">{realtor.email}</span>, their listings will appear here automatically.</>
                  : "No listings yet. Add an email to this realtor profile so listings can be linked when they sign up."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {properties.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => navigate(`/admin/property/${p.id}`)}
                      className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-muted/50 px-2 rounded-md transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.city}{p.district ? `, ${p.district}` : ""} • {p.listing_type === "rent" ? "For Rent" : "For Sale"} • Rs. {Number(p.price).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize shrink-0">{p.status}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent>
            <PaymentHistoryList relatedType="realtor" relatedId={realtor.id} canEditNotes compact />
          </CardContent>
        </Card>
      </main>
      <Footer />

      <RealtorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        realtor={formData}
        onSave={handleSaveRealtor}
        mode="edit"
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await confirm?.onConfirm(); setConfirm(null); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRealtorDetailPage;
