import { forwardRef } from "react";
import { format } from "date-fns";
import { Home } from "lucide-react";

export interface PaymentReceiptRecord {
  id: string;
  service_label: string;
  related_type: string | null;
  related_label: string | null;
  amount: number;
  status: string;
  promo_label: string | null;
  processed_by_role: string | null;
  processed_by_name: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  records: PaymentReceiptRecord[];
  dateFrom?: Date | null;
  dateTo?: Date | null;
  title?: string;
}

const PaymentReceipt = forwardRef<HTMLDivElement, Props>(
  ({ records, dateFrom, dateTo, title = "Payment Receipt" }, ref) => {
    return (
      <div ref={ref} className="p-10 text-black bg-white font-sans">
        <style>{`@page { size: A4; margin: 16mm; }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Home className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold leading-none">Welcome Home</h1>
              <p className="text-xs text-gray-600 mt-1">Real Estate Services</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-base">{title}</p>
            <p className="text-gray-600">Generated {format(new Date(), "MMM d, yyyy h:mm a")}</p>
            {(dateFrom || dateTo) && (
              <p className="text-gray-600 mt-1">
                Range: {dateFrom ? format(dateFrom, "MMM d, yyyy") : "—"} → {dateTo ? format(dateTo, "MMM d, yyyy") : "—"}
              </p>
            )}
            <p className="text-gray-600 mt-1">{records.length} record(s)</p>
          </div>
        </div>

        {/* Records */}
        <div className="space-y-5">
          {records.map((r) => (
            <div key={r.id} className="border border-gray-300 rounded p-4 break-inside-avoid">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Transaction ID</p>
                  <p className="font-mono text-xs">{r.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Date</p>
                  <p className="text-xs">{format(new Date(r.created_at), "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3 border-t border-gray-200 pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Service</p>
                  <p className="font-medium">{r.service_label}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Status</p>
                  <p className="font-medium capitalize">
                    {r.status}
                    {r.promo_label && r.status === "promotion" ? ` — ${r.promo_label}` : ""}
                  </p>
                </div>
                {r.related_label && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      {r.related_type === "property" ? "Property" : r.related_type === "realtor" ? "Realtor" : "Reference"}
                    </p>
                    <p className="font-medium">{r.related_label}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Amount</p>
                  <p className="font-bold text-base">
                    {r.status === "paid" ? `Rs. ${Number(r.amount).toLocaleString()}` : "Rs. 0"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Processed By</p>
                  <p>
                    {r.processed_by_role === "admin" ? "Admin" : "User"}
                    {r.processed_by_name ? ` (${r.processed_by_name})` : ""}
                  </p>
                </div>
                {r.expiration_date && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Active Until</p>
                    <p>{format(new Date(r.expiration_date), "MMM d, yyyy")}</p>
                  </div>
                )}
                {r.notes && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Notes</p>
                    <p className="italic">"{r.notes}"</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {records.length === 0 && (
            <p className="text-center text-gray-500 py-10">No payment records in the selected range.</p>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-300 text-[10px] text-gray-500 text-center">
          This is a computer-generated receipt. For questions, contact Welcome Home support.
        </div>
      </div>
    );
  }
);

PaymentReceipt.displayName = "PaymentReceipt";
export default PaymentReceipt;
