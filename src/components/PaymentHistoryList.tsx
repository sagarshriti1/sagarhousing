import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, Receipt, ShieldCheck, Sparkles, CreditCard } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PaymentRecord {
  id: string;
  service_key: string;
  service_label: string;
  related_type: string | null;
  related_id: string | null;
  related_label: string | null;
  amount: number;
  status: string;
  promo_label: string | null;
  processed_by_role: string | null;
  processed_by_name: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
}

interface Props {
  /** Filter by user (e.g. "show this user's history"). */
  userId?: string;
  /** Filter by related item (e.g. specific realtor or property). */
  relatedType?: "realtor" | "property";
  relatedId?: string;
  /** Allow admins to add/edit notes. */
  canEditNotes?: boolean;
  /** Compact list (for inline panels). */
  compact?: boolean;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Paid</Badge>;
    case "bypassed":
      return <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> Bypassed by Admin</Badge>;
    case "promotion":
      return <Badge className="bg-accent text-accent-foreground hover:bg-accent gap-1"><Sparkles className="h-3 w-3" /> Promotion</Badge>;
    case "free":
      return <Badge variant="outline">Free</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const PaymentHistoryList = ({ userId, relatedType, relatedId, canEditNotes, compact }: Props) => {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    let q = supabase.from("payment_history").select("*").order("created_at", { ascending: false });
    if (userId) q = q.eq("user_id", userId);
    if (relatedType) q = q.eq("related_type", relatedType);
    if (relatedId) q = q.eq("related_id", relatedId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRecords((data ?? []) as PaymentRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, relatedType, relatedId]);

  const saveNote = async (id: string) => {
    const { error } = await supabase.from("payment_history").update({ notes: noteDraft }).eq("id", id);
    if (error) {
      toast.error("Failed to save note");
      return;
    }
    toast.success("Note saved");
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, notes: noteDraft } : r)));
    setEditingNote(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className={`text-center text-sm text-muted-foreground ${compact ? "py-4" : "py-10"}`}>
        <Receipt className="h-6 w-6 mx-auto mb-2 opacity-50" />
        No payment history yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <Card key={r.id} className={compact ? "shadow-none" : ""}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground">{r.service_label}</span>
                  {statusBadge(r.status)}
                  {r.promo_label && r.status === "promotion" && (
                    <span className="text-xs text-accent">— {r.promo_label}</span>
                  )}
                </div>
                {r.related_label && (
                  <p className="text-xs text-muted-foreground truncate">
                    {r.related_type === "property" ? "Property" : "Realtor"}: <span className="font-medium text-foreground">{r.related_label}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-price">
                  {r.status === "paid" ? `Rs. ${Number(r.amount).toLocaleString()}` : "Rs. 0"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(r.created_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Processed by:{" "}
                <span className="font-medium text-foreground">
                  {r.processed_by_role === "admin" ? "👤 Admin" : "You"}
                  {r.processed_by_name ? ` (${r.processed_by_name})` : ""}
                </span>
              </span>
              {r.expiration_date && (
                <span>Active until: <span className="font-medium text-foreground">{format(new Date(r.expiration_date), "MMM d, yyyy")}</span></span>
              )}
            </div>
            {(r.notes || canEditNotes) && (
              <div className="pt-2 border-t border-border">
                {editingNote === r.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Add a note visible to the user…"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => saveNote(r.id)}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs italic text-muted-foreground flex-1">
                      {r.notes ? `"${r.notes}"` : <span className="opacity-60">No notes</span>}
                    </p>
                    {canEditNotes && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { setEditingNote(r.id); setNoteDraft(r.notes ?? ""); }}
                      >
                        {r.notes ? "Edit note" : "Add note"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PaymentHistoryList;
