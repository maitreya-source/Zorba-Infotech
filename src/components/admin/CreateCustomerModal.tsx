import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Phone, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from "lucide-react";
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
import { createCustomer, findCustomerByPhoneNumber, normalizePhone10 } from "@/lib/firestore";
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
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const raw = `${countryCode} ${phoneNumber}`;
    const cleanDigits = normalizePhone10(raw);

    if (cleanDigits.length >= 10) {
      const timer = setTimeout(async () => {
        try {
          const match = await findCustomerByPhoneNumber(raw);
          setDuplicateCustomer(match);
        } catch {
          setDuplicateCustomer(null);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setDuplicateCustomer(null);
    }
  }, [countryCode, phoneNumber]);

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
    if (duplicateCustomer) {
      toast.error(`A customer already exists with this phone number: ${duplicateCustomer.name} (${duplicateCustomer.phone})`);
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
        email: email.trim().toLowerCase() || undefined,
        address: address.trim() ? toTitleCase(address) : undefined,
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
      setDuplicateCustomer(null);
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
                className={`h-8 text-xs flex-1 font-mono ${
                  duplicateCustomer ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200" : ""
                }`}
              />
            </div>

            {duplicateCustomer && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-2 text-[11px] animate-in fade-in slide-in-from-top-1 shadow-2xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-tight flex-1">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="font-bold text-amber-900 dark:text-amber-100">Customer Already Registered:</span>
                    {onCreated && (
                      <button
                        type="button"
                        onClick={() => {
                          onCreated(duplicateCustomer);
                          onOpenChange(false);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline cursor-pointer"
                      >
                        Select This Customer
                      </button>
                    )}
                  </div>
                  <div className="mt-1">
                    <a
                      href={`/admin/customers/${duplicateCustomer.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      title="Open customer profile in new tab"
                    >
                      <span>{duplicateCustomer.name}</span>
                      <ExternalLink className="h-3 w-3 inline shrink-0" />
                    </a>{" "}
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                      ({duplicateCustomer.phone})
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-700/90 dark:text-amber-300/80 mt-1">
                    Duplicate registration is disallowed. Please select or update the existing customer profile.
                  </p>
                </div>
              </div>
            )}
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
                    <Plus className="h-3 w-3" />
                    <span>Add Phone</span>
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
