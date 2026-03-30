import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";

export interface ErrandFilterValues {
  status: string;
  category: string;
  paymentStatus: string;
  sortOrder: string;
}

const defaultFilters: ErrandFilterValues = {
  status: "all",
  category: "all",
  paymentStatus: "all",
  sortOrder: "newest",
};

interface Props {
  filters: ErrandFilterValues;
  onChange: (f: ErrandFilterValues) => void;
}

const ErrandFilters = ({ filters, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const hasActive = filters.status !== "all" || filters.category !== "all" || filters.paymentStatus !== "all";

  const update = (key: keyof ErrandFilterValues, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const reset = () => onChange({ ...defaultFilters });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-medium text-foreground px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
        >
          <Filter className="w-4 h-4 text-muted-foreground" />
          Filters
          {hasActive && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </button>

        <Select value={filters.sortOrder} onValueChange={(v) => update("sortOrder", v)}>
          <SelectTrigger className="w-[130px] h-9 rounded-xl text-xs border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-card border border-border">
          <Select value={filters.status} onValueChange={(v) => update("status", v)}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_payment">Pending Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="awaiting_confirmation">Awaiting Confirmation</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
              <SelectItem value="queueing">Queueing</SelectItem>
              <SelectItem value="document_pickup">Document Pickup</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="shop_check">Shop Check</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.paymentStatus} onValueChange={(v) => update("paymentStatus", v)}>
            <SelectTrigger className="h-9 rounded-xl text-xs">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          {hasActive && (
            <Button variant="ghost" size="sm" onClick={reset} className="h-9 rounded-xl text-xs gap-1 col-span-2 sm:col-span-1">
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export { defaultFilters };
export default ErrandFilters;
