import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, Receipt, ShieldCheck, Sparkles, CreditCard, Printer, CalendarIcon, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import PaymentReceipt, { PaymentReceiptRecord } from "./PaymentReceipt";
import ConfirmSaveButton from "@/components/ConfirmSaveButton";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaymentRecord extends PaymentReceiptRecord {
  service_key: string;
  related_id: string | null;
  user_id: string;
}

interface Props {
  userId?: string;
  relatedType?: "realtor" | "property";
  relatedId?: string;
  canEditNotes?: boolean;
  compact?: boolean;
  pageSize?: number;
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

const PaymentHistoryList = ({ userId, relatedType, relatedId, canEditNotes, compact, pageSize = 20 }: Props) => {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [printRecords, setPrintRecords] = useState<PaymentRecord[]>([]);
  const [printTitle, setPrintTitle] = useState("Payment Receipt");

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: "payment-receipt" });

  // Visibility guard
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!relatedType || !relatedId || userId) {
        setAllowed(true);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setAllowed(false); return; }
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (roleRow) { if (!cancelled) setAllowed(true); return; }
      const table = relatedType === "property" ? "user_properties" : "realtors";
      const { data: ownerRow } = await supabase.from(table).select("user_id").eq("id", relatedId).maybeSingle();
      if (!cancelled) setAllowed(ownerRow?.user_id === user.id);
    };
    check();
    return () => { cancelled = true; };
  }, [userId, relatedType, relatedId]);

  useEffect(() => { setPage(1); }, [userId, relatedType, relatedId, dateFrom, dateTo]);

  const buildQuery = (withRange: boolean, withCount: boolean) => {
    let q = supabase.from("payment_history").select("*", withCount ? { count: "exact" } : undefined).order("created_at", { ascending: false });
    if (userId) q = q.eq("user_id", userId);
    if (relatedType) q = q.eq("related_type", relatedType);
    if (relatedId) q = q.eq("related_id", relatedId);
    if (withRange && dateFrom) q = q.gte("created_at", dateFrom.toISOString());
    if (withRange && dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    return q;
  };

  const fetchRecords = async () => {
    if (allowed === false) { setRecords([]); setTotal(0); setLoading(false); return; }
    if (allowed === null) return;
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const q = buildQuery(true, true).range(from, to);
    const { data, count, error } = await q;
    if (error) toast.error(error.message);
    else {
      setRecords((data ?? []) as PaymentRecord[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, relatedType, relatedId, page, allowed, dateFrom, dateTo]);

  const saveNote = async (id: string) => {
    const { error } = await supabase.from("payment_history").update({ notes: noteDraft }).eq("id", id);
    if (error) { toast.error("Failed to save note"); return; }
    toast.success("Note saved");
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, notes: noteDraft } : r)));
    setEditingNote(null);
  };

  const triggerPrint = async (recs: PaymentRecord[], title: string) => {
    if (recs.length === 0) { toast.info("No records to print"); return; }
    setPrintRecords(recs);
    setPrintTitle(title);
    // wait for state to flush into the hidden template
    await new Promise((r) => setTimeout(r, 50));
    handlePrint?.();
  };

  const handlePrintAll = async () => {
    // fetch full filtered set (cap 1000) so print isn't limited to current page
    const { data, error } = await buildQuery(true, false).limit(1000);
    if (error) { toast.error(error.message); return; }
    triggerPrint((data ?? []) as PaymentRecord[], "Payment History");
  };

  const handlePrintOne = (r: PaymentRecord) => triggerPrint([r], "Payment Receipt");

  const clearRange = () => { setDateFrom(undefined); setDateTo(undefined); };

  if (allowed === false) {
    return <div className={`text-center text-sm text-muted-foreground ${compact ? "py-4" : "py-10"}`}>Access restricted.</div>;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers: (number | "ellipsis")[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const arr: (number | "ellipsis")[] = [1];
    if (page > 3) arr.push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) arr.push(i);
    if (page < totalPages - 2) arr.push("ellipsis");
    arr.push(totalPages);
    return arr;
  })();

  const DateButton = ({ value, placeholder, onChange, disabled }: { value?: Date; placeholder: string; onChange: (d: Date | undefined) => void; disabled?: (d: Date) => boolean }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2 justify-start font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {value ? format(value, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} disabled={disabled} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden" data-print-hide>
        <DateButton
          value={dateFrom}
          placeholder="From date"
          onChange={(d) => { setDateFrom(d); if (d && dateTo && d > dateTo) setDateTo(undefined); }}
          disabled={dateTo ? (d) => d > dateTo : undefined}
        />
        <DateButton
          value={dateTo}
          placeholder="To date"
          onChange={setDateTo}
          disabled={dateFrom ? (d) => d < dateFrom : undefined}
        />
        {(dateFrom || dateTo) && (
          <Button size="sm" variant="ghost" onClick={clearRange} className="gap-1"><X className="h-3.5 w-3.5" /> Clear</Button>
        )}
        <div className="ml-auto">
          <Button size="sm" onClick={handlePrintAll} className="gap-2">
            <Printer className="h-4 w-4" /> Print All
          </Button>
        </div>
      </div>

      {loading || allowed === null ? (
        <div className="flex justify-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className={`text-center text-sm text-muted-foreground ${compact ? "py-4" : "py-10"}`}>
          <Receipt className="h-6 w-6 mx-auto mb-2 opacity-50" />
          No payment history{(dateFrom || dateTo) ? " in this range" : " yet"}.
        </div>
      ) : (
        records.map((r) => (
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
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 print:hidden"
                  data-print-hide
                  title="Print receipt"
                  onClick={() => handlePrintOne(r)}
                >
                  <Printer className="h-4 w-4" />
                </Button>
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
                      <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add a note visible to the user…" rows={2} />
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
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingNote(r.id); setNoteDraft(r.notes ?? ""); }}>
                          {r.notes ? "Edit note" : "Add note"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {totalPages > 1 && (
        <Pagination className="pt-2 print:hidden" data-print-hide>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }} aria-disabled={page === 1} className={page === 1 ? "pointer-events-none opacity-50" : ""} />
            </PaginationItem>
            {pageNumbers.map((p, idx) =>
              p === "ellipsis" ? (
                <PaginationItem key={`e-${idx}`}><PaginationEllipsis /></PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink href="#" isActive={p === page} onClick={(e) => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }} aria-disabled={page === totalPages} className={page === totalPages ? "pointer-events-none opacity-50" : ""} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Hidden print template */}
      <div className="hidden print:block">
        <div ref={printRef}>
          <PaymentReceipt records={printRecords} dateFrom={dateFrom} dateTo={dateTo} title={printTitle} />
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryList;
