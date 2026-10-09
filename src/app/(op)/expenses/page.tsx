"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Button,
  IconButton,
  Input,
  Select,
  Textarea,
  SearchField,
  Sheet,
  Card,
  Badge,
  Money,
  FilterChips,
} from "@/components/ui";
import {
  Receipt,
  Plus,
  Truck,
  Package,
  ShoppingBag,
  Layers,
  AlertTriangle,
  DollarSign,
  Tag,
  Briefcase,
  Calendar,
  Building2,
  TrendingDown,
  Link as LinkIcon,
} from "lucide-react";

interface Batch {
  id: string;
  reference: string;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  notes: string | null;
  batch: { reference: string } | null;
}

const expenseCategories = [
  { value: "ALL", label: "All Expenses" },
  { value: "TRANSPORT", label: "Transport & Travel" },
  { value: "DELIVERY", label: "Delivery & Shipping" },
  { value: "PACKAGING", label: "Packaging & Boxes" },
  { value: "MARKETING", label: "Marketing & Ads" },
  { value: "RESTOCKING", label: "Restocking Overhead" },
  { value: "OPERATIONS", label: "Operations & Rent" },
  { value: "OTHER", label: "Other" },
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Add Expense Sheet
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Form Fields
  const [category, setCategory] = useState("TRANSPORT");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchId, setBatchId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const catParam = selectedCategory !== "ALL" ? `?category=${selectedCategory}` : "";
      const [expRes, batchRes] = await Promise.all([
        fetch(`/api/expenses${catParam}`),
        fetch("/api/batches"),
      ]);

      const [expJson, batchJson] = await Promise.all([expRes.json(), batchRes.json()]);

      if (expJson.success) setExpenses(expJson.data || []);
      else setError(expJson.error || "Failed to load expenses");

      if (batchJson.success) setBatches(batchJson.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  // Global Add Expense Header Trigger
  useEffect(() => {
    const handler = () => openAddModal();
    window.addEventListener("avencia:open-add-expense", handler);
    return () => window.removeEventListener("avencia:open-add-expense", handler);
  }, []);

  const openAddModal = () => {
    setCategory("TRANSPORT");
    setDescription("");
    setAmount("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setBatchId("");
    setNotes("");
    setAddError(null);
    setIsAddOpen(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!description.trim()) {
      setAddError("Expense description is required.");
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setAddError("Expense amount must be greater than GH₵0.");
      return;
    }

    setAddSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          amount: val,
          expenseDate,
          batchId: batchId || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddOpen(false);
        fetchData();
      } else {
        setAddError(json.error || "Failed to record expense");
      }
    } catch (err: any) {
      setAddError(err.message || "Server error recording expense");
    } finally {
      setAddSubmitting(false);
    }
  };

  // Metrics
  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const batchLinkedAmount = useMemo(
    () => expenses.filter((e) => !!e.batch).reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const overheadAmount = totalAmount - batchLinkedAmount;

  // Filtered Expenses by Search
  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses;
    const term = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(term) ||
        (e.notes && e.notes.toLowerCase().includes(term)) ||
        (e.batch && e.batch.reference.toLowerCase().includes(term))
    );
  }, [expenses, search]);

  const getCategoryBadgeVariant = (cat: string) => {
    switch (cat) {
      case "TRANSPORT":
      case "DELIVERY":
        return "primary";
      case "PACKAGING":
      case "RESTOCKING":
        return "outline";
      case "MARKETING":
        return "warning";
      case "OPERATIONS":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Operating Expenses & Overhead
          </h1>
          <p className="text-sm text-muted-foreground">
            Track logistics, packaging, marketing and shipment-associated overhead
          </p>
        </div>

        <Button
          onClick={openAddModal}
          size="md"
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Expense</span>
        </Button>
      </div>

      {/* KPI Metrics Bar */}
      <div className="rounded-lg border border-border bg-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            <Money amount={totalAmount} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {expenses.length} recorded transactions
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">Shipment & Restock Costs</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            <Money amount={batchLinkedAmount} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Tied directly to inventory purchases
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">General Operating Overhead</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            <Money amount={overheadAmount} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Logistics, packaging & marketing
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="rounded-lg border border-border bg-card p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search expenses by description or shipment ref..."
            />
          </div>
        </div>

        <div className="overflow-x-auto pb-0.5 no-scrollbar">
          <FilterChips
            options={expenseCategories.map((c) => ({
              id: c.value,
              label: c.label,
              count:
                c.value === "ALL"
                  ? undefined
                  : expenses.filter((e) => e.category === c.value).length,
            }))}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          <p className="text-sm font-medium">No expenses recorded for this filter</p>
          <p className="text-xs mt-1 text-muted-foreground/80">Click "Log Expense" above to record a new business expense</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-muted-foreground border-b border-border select-none">
                <tr>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Description</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Linked Batch</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.map((exp) => {
                  const dateStr = new Date(exp.expenseDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-secondary/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-muted-foreground tabular-nums whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground block">{exp.description}</span>
                        {exp.notes && (
                          <span className="text-[11px] text-muted-foreground italic block mt-0.5">
                            {exp.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-xs text-muted-foreground font-medium">
                          {exp.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {exp.batch ? (
                          <span className="font-mono text-xs">{exp.batch.reference}</span>
                        ) : (
                          <span className="italic text-muted-foreground/60">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-foreground">
                        <Money amount={exp.amount} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Expense Rows */}
          <div className="md:hidden divide-y divide-border">
            {filteredExpenses.map((exp) => {
              const dateStr = new Date(exp.expenseDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });

              return (
                <div key={exp.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground block truncate">
                      {exp.description}
                    </span>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>{exp.category}</span>
                      {exp.batch && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{exp.batch.reference}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 font-semibold text-foreground tabular-nums">
                    <Money amount={exp.amount} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LOG EXPENSE SHEET */}
      <Sheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Log Operating Expense"
        description="Record transport, packaging, delivery or general business costs"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
          {addError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <Input
            label="Amount (GH₵)"
            type="number"
            step="any"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="text-lg font-black"
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={expenseCategories
              .filter((c) => c.value !== "ALL")
              .map((c) => ({ value: c.value, label: c.label }))}
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Uber delivery to Airport Residential, 500 Gift Bags"
            required
          />

          <Input
            label="Expense Date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />

          {batches.length > 0 && (
            <Select
              label="Link to Shipment / Batch (Optional)"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              options={[
                { value: "", label: "General Overhead (No Batch)" },
                ...batches.map((b) => ({
                  value: b.id,
                  label: b.reference,
                })),
              ]}
            />
          )}

          <Textarea
            label="Additional Notes / Receipt Ref"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vendor name, receipt invoice #..."
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={addSubmitting}
            >
              Save Expense
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
