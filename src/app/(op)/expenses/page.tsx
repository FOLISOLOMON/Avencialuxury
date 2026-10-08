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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Expenses</span>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-2xl font-black text-foreground">
            <Money amount={totalAmount} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {expenses.length} expense transactions
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Shipment / Batch Costs</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            <Money amount={batchLinkedAmount} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Tied to inventory purchases
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">General Overhead</span>
            <Receipt className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-black text-foreground">
            <Money amount={overheadAmount} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Operations, marketing & delivery
          </div>
        </Card>
      </div>

      {/* Filter Chips & Search Bar */}
      <Card className="p-3.5 space-y-3">
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
      </Card>

      {/* Expense List */}
      {filteredExpenses.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No expenses recorded for this filter</p>
          <p className="text-xs mt-1">Click "Log Expense" to record a new business expense</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((exp) => {
            const dateStr = new Date(exp.expenseDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Card
                key={exp.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground leading-snug">
                        {exp.description}
                      </h3>
                      <Badge variant={getCategoryBadgeVariant(exp.category) as any}>
                        {exp.category}
                      </Badge>
                      {exp.batch && (
                        <Badge variant="outline" className="gap-1">
                          <LinkIcon className="w-3 h-3" />
                          <span>{exp.batch.reference}</span>
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dateStr}</span>
                      {exp.notes && (
                        <>
                          <span>•</span>
                          <span className="italic line-clamp-1">{exp.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <div className="text-base font-black text-foreground">
                    <Money amount={exp.amount} />
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Settled
                  </div>
                </div>
              </Card>
            );
          })}
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
