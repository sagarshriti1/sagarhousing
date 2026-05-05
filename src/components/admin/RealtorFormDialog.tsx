import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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

export interface RealtorFormData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  photo_url: string;
  city: string;
  state: string;
  district: string;
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
}

const emptyRealtor: RealtorFormData = {
  name: "",
  email: "",
  phone: "",
  photo_url: "",
  city: "",
  state: "",
  district: "",
  bio: "",
  years_experience: null,
  is_featured: false,
  start_date: null,
  expiration_date: null,
  payment_status: "pending",
  payment_bypassed: false,
  user_id: null,
  specialties: null,
  license_number: null,
};

interface RealtorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  realtor?: RealtorFormData | null;
  onSave: (data: RealtorFormData) => void;
  mode: "create" | "edit";
}

const RealtorFormDialog = ({ open, onOpenChange, realtor, onSave, mode }: RealtorFormDialogProps) => {
  const [form, setForm] = useState<RealtorFormData>(realtor ?? emptyRealtor);
  const [bypassPayment, setBypassPayment] = useState(realtor?.payment_bypassed ?? false);

  // Reset form when realtor changes
  const currentId = realtor?.id ?? null;
  const [lastId, setLastId] = useState<string | null>(null);
  if (currentId !== lastId) {
    setLastId(currentId);
    setForm(realtor ?? emptyRealtor);
    setBypassPayment(realtor?.payment_bypassed ?? false);
  }

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
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (!form.expiration_date) return;
    onSave(form);
  };

  const isCreate = mode === "create";

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
              <Label>District</Label>
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
            <Label>Photo URL</Label>
            <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
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
                    form.payment_status === "bypassed" ? "secondary" :
                    "destructive"
                  }
                >
                  {form.payment_status === "paid" ? "Paid" :
                   form.payment_status === "bypassed" ? "Bypassed" :
                   "Pending"}
                </Badge>
              </div>

              {/* Bypass Payment */}
              <div className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border bg-background">
                <ShieldCheck className="h-5 w-5 text-accent shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Bypass Payment</p>
                  <p className="text-xs text-muted-foreground">Skip payment verification for this realtor</p>
                </div>
                <Checkbox
                  checked={bypassPayment}
                  onCheckedChange={(checked) => handleBypassToggle(!!checked)}
                />
              </div>

              {/* Simulated Payment Form */}
              {!bypassPayment && (
                <SimulatedPaymentForm
                  paid={form.payment_status === "paid"}
                  onPaymentComplete={() => setForm(prev => ({ ...prev, payment_status: "paid" }))}
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
                      onSelect={(date) => setForm({ ...form, start_date: date ? format(date, "yyyy-MM-dd") : null })}
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
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || !form.expiration_date}>
              {isCreate ? "Create Realtor" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RealtorFormDialog;
