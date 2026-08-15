import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Phone, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
import { createCustomer } from "@/lib/firestore";
import { toTitleCase, formatIndianPhoneNumber } from "@/lib/utils";
import type { Customer } from "@/lib/types";

interface CreateCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (customer: Customer) => void;
}

export default function CreateCustomerModal({
  open,
  onOpenChange,
  onCreated,
}: CreateCustomerModalProps) {
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    const formattedName = toTitleCase(name);
    const fullPhone = formatIndianPhoneNumber(`${countryCode.trim()} ${phoneNumber.trim()}`);
    const cleanExtraPhones = additionalPhones
      .filter((p) => p.trim().length > 3)
      .map(formatIndianPhoneNumber);

    setSaving(true);
    try {
      const cust = await createCustomer({
        name: formattedName,
        phone: fullPhone,
        additionalPhones: cleanExtraPhones.length > 0 ? cleanExtraPhones : undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        companyName: companyName.trim() ? toTitleCase(companyName) : undefined,
      });
      toast.success("Customer created successfully");
      onCreated?.(cust);
      onOpenChange(false);
      // Reset form
      setName("");
      setPhoneNumber("");
      setEmail("");
      setAddress("");
      setCompanyName("");
      setAdditionalPhones([]);
      setShowMoreDetails(false);
    } catch (err: any) {
      console.error("Error creating customer:", err);
      toast.error(err?.message || "Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Customer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div>
            <Label htmlFor="cust-name" className="text-xs font-semibold">
              Customer Name (LastName FirstName) *
            </Label>
            <Input
              id="cust-name"
              placeholder="e.g. Sharma Rajesh (LastName FirstName)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 h-8 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Contact Phone Number *</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                placeholder="+91"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-8 text-xs w-20 text-center font-bold font-mono"
                required
              />
              <Input
                id="cust-phone"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="h-8 text-xs flex-1 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cust-email" className="text-xs font-semibold">Email Address</Label>
              <Input
                id="cust-email"
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="cust-company" className="text-xs font-semibold">Company / Business Name</Label>
              <Input
                id="cust-company"
                placeholder="e.g. Zorba Partner"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cust-address" className="text-xs font-semibold">Address / Onsite Location</Label>
            <Input
              id="cust-address"
              placeholder="Shop #, Street, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>

          {/* Expandable Section: Additional Phone Numbers */}
          <div className="border-t pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="flex items-center justify-between w-full py-1 text-xs font-bold text-primary hover:underline"
            >
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> More Details: Additional Phone Numbers ({additionalPhones.length})
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
              {saving ? "Saving…" : "Save Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
