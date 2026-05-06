import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Save, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FeatureFlag } from "@/hooks/useFeatureFlag";

const FeaturesTab = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, FeatureFlag>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("feature_flags").select("*").order("label");
    if (error) {
      toast.error("Failed to load feature flags");
    } else {
      const list = (data as FeatureFlag[]) ?? [];
      setFlags(list);
      setDrafts(Object.fromEntries(list.map((f) => [f.id, f])));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, patch: Partial<FeatureFlag>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    if (draft.fee < 0) {
      toast.error("Fee cannot be negative");
      return;
    }
    setSaving(id);
    const { error } = await supabase
      .from("feature_flags")
      .update({
        fee: draft.fee,
        bypass_payment: draft.bypass_payment,
        promo_label: draft.promo_label?.trim() || null,
        promo_ends_at: draft.promo_ends_at,
      })
      .eq("id", id);
    setSaving(null);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    toast.success(`${draft.label} updated`);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Feature Flags & Pricing</h2>
        <p className="text-sm text-muted-foreground">
          Control fees and run free promotions for each paid service. Changes apply to new transactions immediately.
        </p>
      </div>

      <div className="grid gap-4">
        {flags.map((flag) => {
          const draft = drafts[flag.id] ?? flag;
          const promoActive =
            draft.bypass_payment &&
            (!draft.promo_ends_at || new Date(draft.promo_ends_at).getTime() > Date.now());
          return (
            <Card key={flag.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {draft.label}
                      {promoActive && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" /> Promotion active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{draft.description}</CardDescription>
                    <p className="mt-1 text-xs text-muted-foreground">Key: <code>{draft.key}</code></p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Fee (Rs.)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draft.fee === 0 ? "0" : String(draft.fee).replace(/^0+/, "")}
                      disabled={draft.bypass_payment}
                      onChange={(e) => {
                        const v = e.target.value.replace(/^0+(?=\d)/, "");
                        update(flag.id, { fee: v === "" ? 0 : Number(v) });
                      }}
                    />
                    {draft.bypass_payment && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Disabled while promotion is active (service is free).
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col justify-center rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-sm">Free Promotion (Bypass Payment)</Label>
                        <p className="text-xs text-muted-foreground">
                          When ON, users get this service free with instant activation.
                        </p>
                      </div>
                      <Switch
                        checked={draft.bypass_payment}
                        onCheckedChange={(checked) => update(flag.id, { bypass_payment: checked })}
                      />
                    </div>
                  </div>
                </div>

                {draft.bypass_payment && (
                  <div className="grid gap-4 md:grid-cols-2 rounded-md border border-dashed p-3 bg-muted/30">
                    <div>
                      <Label>Promo Label (optional)</Label>
                      <Input
                        placeholder="e.g. Diwali Special — Free!"
                        value={draft.promo_label ?? ""}
                        onChange={(e) => update(flag.id, { promo_label: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Promo Ends (optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !draft.promo_ends_at && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {draft.promo_ends_at
                              ? format(new Date(draft.promo_ends_at), "PPP")
                              : "No end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={draft.promo_ends_at ? new Date(draft.promo_ends_at) : undefined}
                            onSelect={(date) =>
                              update(flag.id, { promo_ends_at: date ? date.toISOString() : null })
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      {draft.promo_ends_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-auto p-1 text-xs"
                          onClick={() => update(flag.id, { promo_ends_at: null })}
                        >
                          Clear end date
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => save(flag.id)} disabled={saving === flag.id} className="gap-2">
                    {saving === flag.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturesTab;
