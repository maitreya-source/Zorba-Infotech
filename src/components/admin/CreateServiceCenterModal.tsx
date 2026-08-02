import { useState } from "react";
import { Building2, Plus, Trash2, Check, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createServiceCenter } from "@/lib/firestore";
import type { ServiceCenter, ServiceCenterAddress } from "@/lib/types";

interface CreateServiceCenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (sc: ServiceCenter) => void;
}

export default function CreateServiceCenterModal({
  open,
  onOpenChange,
  onCreated,
}: CreateServiceCenterModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addresses, setAddresses] = useState<ServiceCenterAddress[]>([
    { id: "addr-1", address: "", city: "", isDefault: true },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddAddress = () => {
    setAddresses((prev) => [
      ...prev,
      { id: `addr-${Date.now()}`, address: "", city: "", isDefault: prev.length === 0 },
    ]);
  };

  const handleSetDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  };

  const handleUpdateAddress = (id: string, field: "address" | "city", val: string) => {
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: val } : a))
    );
  };

  const handleRemoveAddress = (id: string) => {
    if (addresses.length <= 1) return;
    setAddresses((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      if (!filtered.some((a) => a.isDefault) && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter Service Center Name");
      return;
    }
    const validAddresses = addresses.filter((a) => a.address.trim().length > 0);
    if (validAddresses.length === 0) {
      toast.error("Please provide at least one address");
      return;
    }

    const defaultAddr = validAddresses.find((a) => a.isDefault) || validAddresses[0];

    setSubmitting(true);
    try {
      const newSC = await createServiceCenter({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        addresses: validAddresses,
        defaultAddressId: defaultAddr.id,
      });

      toast.success("Service Center added successfully");
      setName("");
      setPhone("");
      setEmail("");
      setAddresses([{ id: "addr-1", address: "", city: "", isDefault: true }]);
      onOpenChange(false);
      if (onCreated) onCreated(newSC);
    } catch {
      toast.error("Failed to create Service Center");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <Building2 className="h-4 w-4" />
            </div>
            Add Company Service Center
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div>
            <Label htmlFor="sc-name" className="text-xs font-semibold">
              Service Center Name *
            </Label>
            <Input
              id="sc-name"
              placeholder="e.g. HP Authorised Regional Service Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sc-phone" className="text-xs font-semibold">Phone Number</Label>
              <Input
                id="sc-phone"
                placeholder="+91 Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="sc-email" className="text-xs font-semibold">Email Address</Label>
              <Input
                id="sc-email"
                placeholder="support@service.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          {/* Multiple Addresses Section */}
          <div className="space-y-2 pt-1 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Parcel / Dispatch Addresses (Multiple Supported) *
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddAddress}
                className="h-6 text-[11px] gap-1 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" /> + Add Address
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {addresses.map((item, idx) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-2.5 space-y-2 transition-all ${
                    item.isDefault ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500/20" : "bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] text-foreground">
                      Address #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetDefault(item.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                          item.isDefault
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-muted text-muted-foreground hover:bg-purple-100 dark:hover:bg-purple-950"
                        }`}
                      >
                        <Star className="h-2.5 w-2.5 fill-current" />
                        {item.isDefault ? "Default Address" : "Set as Default"}
                      </button>
                      {addresses.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAddress(item.id)}
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <Input
                    placeholder="Full Street Address / Industrial Hub"
                    value={item.address}
                    onChange={(e) => handleUpdateAddress(item.id, "address", e.target.value)}
                    className="h-7 text-xs"
                    required
                  />

                  <Input
                    placeholder="City / State (e.g. Pune, Gurugram)"
                    value={item.city}
                    onChange={(e) => handleUpdateAddress(item.id, "city", e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="font-bold">
              {submitting ? "Saving…" : "Save Service Center"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
