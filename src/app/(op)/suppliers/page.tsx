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
} from "@/components/ui";
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  PackageCheck,
  Calendar,
  Layers,
  Pencil,
  AlertTriangle,
  Building2,
  DollarSign,
  User,
} from "lucide-react";

interface BatchSummary {
  id: string;
  reference: string;
  totalInvestment: number;
  purchaseDate: string;
  status: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  totalBatches: number;
  totalInvestment: number;
  batches: BatchSummary[];
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal / Sheet State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Detail Modal / Sheet
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) setSuppliers(json.data || []);
      else setError(json.error || "Failed to load suppliers");
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  // Global Header Listener
  useEffect(() => {
    const handler = () => openCreateModal();
    window.addEventListener("avencia:open-add-supplier", handler);
    return () => window.removeEventListener("avencia:open-add-supplier", handler);
  }, []);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson || "");
    setPhone(s.phone || "");
    setEmail(s.email || "");
    setAddress(s.address || "");
    setNotes(s.notes || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Supplier company or vendor name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : "/api/suppliers";
      const method = editingSupplier ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        setFormError(json.error || "Could not save supplier");
      }
    } catch (err: any) {
      setFormError(err.message || "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalVendors = suppliers.length;
  const totalCapitalDisbursed = useMemo(
    () => suppliers.reduce((sum, s) => sum + Number(s.totalInvestment || 0), 0),
    [suppliers]
  );
  const totalBatchesSupplied = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.totalBatches || 0), 0),
    [suppliers]
  );

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header & Add Supplier Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Suppliers & Fragrance Houses
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage wholesale importers, perfumery suppliers & procurement history
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          size="md"
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </Button>
      </div>

      {/* Summary Metrics Bar */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Vendors
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums tracking-tight">
              {totalVendors}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Active wholesale partners</div>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Capital Disbursed
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
              <Money amount={totalCapitalDisbursed} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total procurement volume</div>
          </div>

          <div className="p-4 sm:p-5 bg-muted/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Consignments Fulfilled
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums tracking-tight">
              {totalBatchesSupplied}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Shipment batches delivered</div>
          </div>
        </div>
      </Card>

      {/* Search Toolbar */}
      <Card className="p-3">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers by company name or contact person..."
        />
      </Card>

      {/* Suppliers Table & Directory */}
      {suppliers.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <p className="text-sm font-medium">No suppliers found</p>
          <p className="text-xs mt-1">Register a new vendor to link shipment batches</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Batches</th>
                  <th className="py-3 px-4 text-right">Total Disbursed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {s.contactPerson || "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      <div>{s.phone || "—"}</div>
                      {s.email && <div className="text-[11px] text-muted-foreground/80">{s.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px] truncate">
                      {s.address || "—"}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-foreground tabular-nums font-medium">
                      {s.totalBatches}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-bold text-foreground tabular-nums whitespace-nowrap">
                      <Money amount={s.totalInvestment} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedSupplier(s)}
                          className="text-xs h-7 px-2"
                        >
                          History
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(s)}
                          className="text-xs h-7 px-2"
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Row View */}
          <div className="md:hidden divide-y divide-border">
            {suppliers.map((s) => (
              <div key={s.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{s.name}</div>
                    {s.contactPerson && (
                      <div className="text-xs text-muted-foreground mt-0.5">{s.contactPerson}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground tabular-nums">
                      <Money amount={s.totalInvestment} />
                    </div>
                    <div className="text-[11px] text-muted-foreground">{s.totalBatches} batches</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  {s.phone && <div>📞 {s.phone}</div>}
                  {s.email && <div>✉️ {s.email}</div>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedSupplier(s)}
                    className="text-xs h-7 px-2"
                  >
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(s)}
                    className="text-xs h-7 px-2"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* CREATE / EDIT SUPPLIER SHEET */}
      <Sheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
        description="Vendor details for inventory procurement & batch linking"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Company / Vendor Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dubai Perfume Wholesalers Ltd"
            required
          />

          <Input
            label="Contact Person"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="e.g. Tariq Al-Mansoor"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971 50 123 4567"
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@vendor.com"
            />
          </div>

          <Input
            label="Address / Warehouse Location"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Deira Gold Souk, Dubai, UAE"
          />

          <Textarea
            label="Vendor Notes / Terms"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, minimum order quantities..."
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={submitting}
            >
              {editingSupplier ? "Update Supplier" : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* SUPPLIER DETAIL SHEET */}
      <Sheet
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name || "Supplier Consignments"}
        description={selectedSupplier?.contactPerson || "Vendor details"}
      >
        {selectedSupplier && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Capital Disbursed</span>
                <span className="font-black text-foreground">
                  {formatCurrency(selectedSupplier.totalInvestment)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consignments Delivered</span>
                <span className="font-bold text-foreground">{selectedSupplier.totalBatches}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-2">Shipment Batches Supplied</h4>
              {(!selectedSupplier.batches || selectedSupplier.batches.length === 0) ? (
                <p className="text-muted-foreground italic">No batches linked to this vendor yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedSupplier.batches.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-card border border-border flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-foreground">{b.reference}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(b.purchaseDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-foreground">
                          {formatCurrency(b.totalInvestment)}
                        </div>
                        <Badge variant={b.status === "COMPLETED" ? "secondary" : "success"}>
                          {b.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
