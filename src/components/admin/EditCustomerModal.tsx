import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Phone, Plus, Trash2, ChevronDown, ChevronUp, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateCustomer } from "@/lib/firestore";
import type { Customer } from "@/lib/types";

interface EditCustomerModalProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export default function EditCustomerModal({
  customer,
  open,
  onOpenChange,
  onUpdated,
}: EditCustomerModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setPhone(customer.phone || "");
      setEmail(customer.email || "");
      setAddress(customer.address || "");
      setCompanyName(customer.companyName || "");
      setAdditionalPhones(customer.additionalPhones || []);
      if (customer.additionalPhones && customer.additionalPhones.length > 0) {
        setShowMoreDetails(true);
      }
    }
  }, [customer]);

  const handleAddPhone = () => {
    setAdditionalPhones((prev) => [...prev, "+91 "]);
  };

  const handleUpdatePhone = (index: number, val: string) => {
    setAdditionalPhones((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemovePhone = (index: number) => {
    setAdditionalPhones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!phone.trim()) {
      toast.error("Primary phone number is required");
      return;
    }

    const cleanExtraPhones = additionalPhones.filter((p) => p.trim().length > 3);

    setSaving(true);
    try {
      await updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        additionalPhones: cleanExtraPhones.length > 0 ? cleanExtraPhones : undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });

      toast.success("Customer profile updated");
      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating customer:", err);
      toast.error(err?.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-base">
            <User className="h-5 w-5 text-primary" />
            Edit Customer Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div>
            <Label htmlFor="edit-cust-name" className="text-xs font-semibold">
              Customer Name (LastName FirstName) *
            </Label>
            <Input
              id="edit-cust-name"
              placeholder="e.g. Sharma Rajesh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 h-8 text-xs"
            />
          </div>

          <div>
            <Label htmlFor="edit-cust-phone" className="text-xs font-semibold">
              Primary Phone Number *
            </Label>
            <Input
              id="edit-cust-phone"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="mt-1 h-8 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-cust-email" className="text-xs font-semibold">Email Address</Label>
              <Input
                id="edit-cust-email"
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="edit-cust-company" className="text-xs font-semibold">Company / Business Name</Label>
              <Input
                id="edit-cust-company"
                placeholder="e.g. Zorba Partner"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-cust-address" className="text-xs font-semibold">Address / Location</Label>
            <Input
              id="edit-cust-address"
              placeholder="Shop #, Street, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>

          {/* Expandable Section: Additional Contacts */}
          <div className="border-t pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="flex items-center justify-between w-full py-1 text-xs font-bold text-primary hover:underline"
            >
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Additional Phone Numbers & Contacts ({additionalPhones.length})
              </span>
              {showMoreDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showMoreDetails && (
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Secondary Numbers (Landline, Alternate Mobile)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddPhone}
                    className="h-6 text-[11px] gap-1 text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3 w-3" /> + Add Phone
                  </Button>
                </div>

                {additionalPhones.map((pVal, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="+91 98000 00000"
                      value={pVal}
                      onChange={(e) => handleUpdatePhone(i, e.target.value)}
                      className="h-7 text-xs font-mono bg-card"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePhone(i)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="font-bold">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
