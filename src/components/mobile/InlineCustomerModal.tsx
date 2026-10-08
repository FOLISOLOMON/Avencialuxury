"use client";

import React, { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { addPendingCustomer, putCachedCustomer } from "@/lib/mobile/db";
import { MobileCustomer } from "@/lib/mobile/types";
import { useToast } from "@/components/ui/ToastProvider";
import { UserPlus, CheckCircle2 } from "lucide-react";

interface InlineCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: MobileCustomer) => void;
}

export function InlineCustomerModal({
    isOpen,
    onClose,
    onCustomerCreated,
  }: InlineCustomerModalProps) {
    const toast = useToast();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        toast.error("Please enter customer name", "Name required");
        return;
      }
  
      if (!phone.trim()) {
        toast.error("Please enter a valid phone number", "Phone required");
        return;
      }
  
      setSaving(true);
      const offlineId = "cust_off_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  
      try {
        if (navigator.onLine) {
          // Online: Save directly to shared backend
          const res = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              phone: phone.trim(),
              notes: notes.trim() || undefined,
            }),
          });
  
          const json = await res.json();
          if (json.success && json.data) {
            const newCust: MobileCustomer = {
              id: json.data.id,
              name: json.data.name,
              phone: json.data.phone,
              notes: json.data.notes,
              totalDebt: 0,
              totalSpent: 0,
            };
  
            // Cache locally in IndexedDB
            await putCachedCustomer(newCust);
  
            toast.success(`${newCust.name} saved and selected`, "Customer Added");
  
            onCustomerCreated(newCust);
            setName("");
            setPhone("");
            setNotes("");
            onClose();
            return;
          } else {
            throw new Error(json.error || "Failed to create customer");
          }
        } else {
          // Offline: Save to pending queue + IndexedDB local cache
          const offlineCust: MobileCustomer = {
            id: offlineId,
            name: name.trim(),
            phone: phone.trim(),
            notes: notes.trim() || undefined,
            totalDebt: 0,
            totalSpent: 0,
          };
  
          await addPendingCustomer({
            offlineId,
            name: name.trim(),
            phone: phone.trim(),
            notes: notes.trim() || undefined,
          });
  
          await putCachedCustomer(offlineCust);
  
          toast.warning(`${offlineCust.name} saved locally. Will sync when online.`, "Customer Saved Offline");
  
          onCustomerCreated(offlineCust);
          setName("");
          setPhone("");
          setNotes("");
          onClose();
        }
      } catch (err: any) {
        console.error("Failed to add customer:", err);
        // Fallback to offline store on network fail
        const fallbackCust: MobileCustomer = {
          id: offlineId,
          name: name.trim(),
          phone: phone.trim(),
          notes: notes.trim() || undefined,
          totalDebt: 0,
          totalSpent: 0,
        };
  
        await addPendingCustomer({
          offlineId,
          name: name.trim(),
          phone: phone.trim(),
          notes: notes.trim() || undefined,
        });
  
        await putCachedCustomer(fallbackCust);
  
        toast.warning("Network issue. Customer queued for auto-sync.", "Saved Locally");

      onCustomerCreated(fallbackCust);
      setName("");
      setPhone("");
      setNotes("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Customer"
      description="Create customer profile during checkout"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Customer Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Abena Mensah"
            autoFocus
            required
            className="text-base"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Phone Number <span className="text-destructive">*</span>
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0244123456"
            type="tel"
            required
            className="text-base"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Notes / Preference (Optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Prefers sweet vanilla scents, Instagram client"
            rows={2}
          />
        </div>

        <div className="pt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            className="flex-1 bg-primary text-primary-foreground font-semibold"
            disabled={saving}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Save & Select
              </>
            )}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
