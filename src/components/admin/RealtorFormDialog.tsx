import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { NEPAL_CITIES, NEPAL_DISTRICTS, getDistrictForCity } from "@/data/nepalLocations";
import { CreditCard, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import SimulatedPaymentForm from "@/components/SimulatedPaymentForm";
import { useFeatureFlag, FEATURE_KEYS } from "@/hooks/useFeatureFlag";
import PaymentHistoryList from "@/components/PaymentHistoryList";

export interface RealtorFormData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  photo_url: string;
  city: string;
  state: string;
  district: string;
  street_address: string;
  bio: string;
  years_experience: number | null;
  is_featured: boolean;
  start_date: string | null;
  expiration_date: string | null;
  payment_status: string;
  payment_bypassed: boolean;
  user_id: string | null;
  specialties: string[] | null;
  license_number: string | null;
  /** Reason admin entered when bypassing payment. Not stored on the realtor row — passed through to payment_history.notes. */
  bypass_reason?: string | null;
}

const addMonths = (dateStr: string, months: number) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return format(d, "yyyy-MM-dd");
};
const todayStr = () => format(new Date(), "yyyy-MM-dd");

const buildEmptyRealtor = (): RealtorFormData => {
  const start = todayStr();
  return {
    name: "",
    email: "",
    phone: "",
    photo_url: "",
    city: "",
    state: "",
    district: "",
    street_address: "",
    bio: "",
    years_experience: null,
    is_featured: false,
    start_date: start,
    expiration_date: addMonths(start, 1),
    payment_status: "pending",
    payment_bypassed: false,
    user_id: null,
    specialties: null,
    license_number: null,
    bypass_reason: null,
  };
};

interface RealtorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  realtor?: RealtorFormData | null;
  onSave: (data: RealtorFormData) => void;
  mode: "create" | "edit";
}

const RealtorFormDialog = ({ open, onOpenChange, realtor, onSave, mode }: RealtorFormDialogProps) => {
  const isCreate = mode === "create";
  const { fee: realtorFee, isFree: realtorPromoFree, promoLabel: realtorPromoLabel } =
    useFeatureFlag(isCreate ? FEATURE_KEYS.REALTOR_SIGNUP : FEATURE_KEYS.REALTOR_RENEWAL);
  const [form, setFormState] = useState<RealtorFormData>(realtor ?? buildEmptyRealtor());
  const [dirty, setDirty] = useState(false);
  const setForm: typeof setFormState = (next) => {
    setDirty(true);
    setFormState(next as any);
  };
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [bypassPayment, setBypassPayment] = useState(realtor?.payment_bypassed ?? false);

  // Reset form when realtor changes
  const currentId = realtor?.id ?? null;
  const [lastId, setLastId] = useState<string | null>(null);
  if (currentId !== lastId) {
    setLastId(currentId);
    setFormState(realtor ?? buildEmptyRealtor());
    setBypassPayment(realtor?.payment_bypassed ?? false);
    setDirty(false);
  }

  // Auto-mark as promotion when free promo flag is active
  useEffect(() => {
    if (realtorPromoFree && form.payment_status !== "promotion" && form.payment_status !== "paid") {
      setForm(prev => ({ ...prev, payment_status: "promotion", payment_bypassed: true }));
    }
  }, [realtorPromoFree]);

  const handleCityChange = (city: string) => {
    const district = getDistrictForCity(city);
    setForm(prev => ({ ...prev, city, ...(district ? { state: district, district } : {}) }));
  };

  const handleDistrictChange = (district: string) => {
    const cityDistrict = getDistrictForCity(form.city);
    setForm(prev => ({
      ...prev,
      state: district,
      district,
      ...(cityDistrict !== district ? { city: "" } : {}),
    }));
  };

  const handleBypassToggle = (checked: boolean) => {
    setBypassPayment(checked);
    setForm(prev => ({
      ...prev,
      payment_bypassed: checked,
      payment_status: checked ? "bypassed" : "pending",
      bypass_reason: checked ? prev.bypass_reason ?? "" : null,
    }));
  };

  const datesValid = !!form.start_date && !!form.expiration_date && new Date(form.start_date) < new Date(form.expiration_date);
  const bypassReasonValid = !bypassPayment || realtorPromoFree || !!(form.bypass_reason && form.bypass_reason.trim().length >= 3);
  const isValid = form.name.trim() && form.email.trim() && form.phone.trim() && (form.district || form.state) && datesValid && bypassReasonValid;

  const handleSubmit = () => {
    if (!isValid) {
      if (form.start_date && form.expiration_date && !datesValid) {
        toast.error("Start date must be earlier than expiration date");
      } else if (!bypassReasonValid) {
        toast.error("Please provide a reason for bypassing payment");
      }
      return;
    }
    onSave(form);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Create Realtor Profile" : "Edit Realtor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Years Experience</Label>
              <Input type="number" value={form.years_experience ?? ""} onChange={(e) => setForm({ ...form, years_experience: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="col-span-2">
              <Label>Street Address</Label>
              <Input value={form.street_address} onChange={(e) => setForm({ ...form, street_address: e.target.value })} placeholder="e.g. Thamel, Ward No. 26" />
            </div>
            <div>
              <Label>City</Label>
              <Select value={form.city} onValueChange={handleCityChange}>
                <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                <SelectContent>
                  {NEPAL_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>District *</Label>
              <Select value={form.state || form.district} onValueChange={handleDistrictChange}>
                <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                <SelectContent>
                  {NEPAL_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-4 mt-1">
              <div className="h-16 w-16 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Realtor" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
                    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
                    setUploadingPhoto(true);
                    const ext = file.name.split(".").pop();
                    const folder = form.user_id || form.id || `new-${Date.now()}`;
                    const filePath = `${folder}/photo-${Date.now()}.${ext}`;
                    const { error } = await supabase.storage.from("realtor-photos").upload(filePath, file, { upsert: true });
                    if (error) { toast.error("Failed to upload photo"); setUploadingPhoto(false); return; }
                    const { data: urlData } = supabase.storage.from("realtor-photos").getPublicUrl(filePath);
                    setForm({ ...form, photo_url: urlData.publicUrl });
                    toast.success("Photo uploaded!");
                    setUploadingPhoto(false);
                  }}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()} className="gap-2">
                  {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 5MB.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_featured} onCheckedChange={(checked) => setForm({ ...form, is_featured: checked })} />
            <Label>Featured / Advertised</Label>
          </div>

          <Separator />

          {/* Subscription & Payment Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Subscription & Payment</h3>
            </div>

            {/* Payment Status */}
            <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Payment Status</p>
                  <p className="text-xs text-muted-foreground">
                    {isCreate ? "Payment is required to activate realtor profile" : "Current payment state"}
                  </p>
                </div>
                <Badge
                  variant={
                    form.payment_status === "paid" ? "default" :
                    form.payment_status === "bypassed" || form.payment_status === "promotion" ? "secondary" :
                    "destructive"
                  }
                >
                  {form.payment_status === "paid" ? "Paid" :
                   form.payment_status === "bypassed" ? "Bypassed" :
                   form.payment_status === "promotion" ? "Promotion (Free)" :
                   "Pending"}
                </Badge>
              </div>

              {realtorPromoFree && (
                <div className="flex items-center gap-3 p-3 rounded-md border border-accent/40 bg-accent/10">
                  <ShieldCheck className="h-5 w-5 text-accent shrink-0" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-foreground">🎉 {realtorPromoLabel || "Free promotion active"}</p>
                    <p className="text-xs text-muted-foreground">No payment required for this service right now.</p>
                  </div>
                </div>
              )}

              {/* Bypass Payment (per-realtor manual override) */}
              <div className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border bg-background">
                <ShieldCheck className="h-5 w-5 text-accent shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Bypass Payment</p>
                  <p className="text-xs text-muted-foreground">Skip payment verification for this realtor</p>
                </div>
                <Checkbox
                  checked={bypassPayment || realtorPromoFree}
                  disabled={realtorPromoFree}
                  onCheckedChange={(checked) => handleBypassToggle(!!checked)}
                />
              </div>

              {bypassPayment && !realtorPromoFree && (
                <div className="space-y-2 p-3 rounded-md border border-amber-500/40 bg-amber-500/5">
                  <Label className="text-sm">
                    Reason for bypass <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={form.bypass_reason ?? ""}
                    onChange={(e) => setForm({ ...form, bypass_reason: e.target.value })}
                    placeholder="Explain why payment is being bypassed (e.g. complimentary access, partner agreement, manual offline payment)…"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason is mandatory and will be visible in the payment history for both the admin and the realtor.
                  </p>
                </div>
              )}

              {/* Simulated Payment Form */}
              {!bypassPayment && !realtorPromoFree && (
                <SimulatedPaymentForm
                  paid={form.payment_status === "paid"}
                  onPaymentComplete={() => setForm(prev => ({ ...prev, payment_status: "paid" }))}
                  amount={realtorFee}
                  label={isCreate ? "Realtor signup fee" : "Realtor renewal fee"}
                />
              )}
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.start_date ? format(new Date(form.start_date), "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.start_date ? new Date(form.start_date) : undefined}
                      onSelect={(date) => {
                        if (!date) { setForm({ ...form, start_date: null }); return; }
                        const s = format(date, "yyyy-MM-dd");
                        setForm({ ...form, start_date: s, expiration_date: addMonths(s, 1) });
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Expiration Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.expiration_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.expiration_date ? format(new Date(form.expiration_date), "PPP") : "Pick expiration date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.expiration_date ? new Date(form.expiration_date) : undefined}
                      onSelect={(date) => setForm({ ...form, expiration_date: date ? format(date, "yyyy-MM-dd") : null })}
                      disabled={form.start_date ? { from: new Date(-8640000000000000), to: new Date(form.start_date) } : undefined}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {form.start_date && form.expiration_date && new Date(form.start_date) >= new Date(form.expiration_date) && (
              <p className="text-xs text-destructive">Start date must be earlier than expiration date.</p>
            )}
          </div>

          {!isCreate && form.id && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Payment History</h3>
                </div>
                <PaymentHistoryList relatedType="realtor" relatedId={form.id} canEditNotes compact />
              </div>
            </>
          )}

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isValid}>
              {isCreate ? "Create Realtor" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RealtorFormDialog;
