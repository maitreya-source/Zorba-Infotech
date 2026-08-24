import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building2, Trash2, MapPin, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateServiceCenter } from "@/lib/firestore";
import { toTitleCase, formatIndianPhoneNumber } from "@/lib/utils";
import type { ServiceCenter, ServiceCenterAddress, ServiceCenterPOC } from "@/lib/types";

interface EditServiceCenterModalProps {
  center: ServiceCenter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export default function EditServiceCenterModal({
  center,
  open,
  onOpenChange,
  onUpdated,
}: EditServiceCenterModalProps) {
  const [name, setName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [generalPhone, setGeneralPhone] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [addresses, setAddresses] = useState<ServiceCenterAddress[]>([]);
  const [pocs, setPocs] = useState<ServiceCenterPOC[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (center) {
      setName(center.name || "");
      setWhatsappPhone(center.whatsappPhone || "");
      setGeneralPhone(center.phone || "");
      setEmail(center.email || "");
      setActive(center.active !== false);
      setAddresses(center.addresses?.length ? center.addresses : [{ id: `addr-1`, city: "Indore", address: "", isDefault: true }]);
      setPocs(center.pocs?.length ? center.pocs : [{ id: `poc-1`, name: "", designation: "RMA Coordinator", phone: "", isWhatsApp: true }]);
    }
  }, [center]);

  const handleAddAddress = () => {
    setAddresses((prev) => [
      ...prev,
      { id: `addr-${Date.now()}`, city: "", address: "", isDefault: false },
    ]);
  };

  const handleRemoveAddress = (idx: number) => {
    setAddresses((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateAddress = (idx: number, field: keyof ServiceCenterAddress, val: any) => {
    setAddresses((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleAddPoc = () => {
    setPocs((prev) => [
      ...prev,
      { id: `poc-${Date.now()}`, name: "", designation: "Support Executive", phone: "", isWhatsApp: false },
    ]);
  };

  const handleRemovePoc = (idx: number) => {
    setPocs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdatePoc = (idx: number, field: keyof ServiceCenterPOC, val: any) => {
    setPocs((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!center) return;
    if (!name.trim()) {
      toast.error("Service Center name is required");
      return;
    }

    const cleanAddresses = addresses
      .filter((a) => a.address.trim().length > 0)
      .map((a) => ({
        ...a,
        city: a.city?.trim() ? toTitleCase(a.city) : undefined,
        address: toTitleCase(a.address),
      }));

    const cleanPocs = pocs
      .filter((p) => p.name.trim().length > 0)
      .map((p) => ({
        ...p,
        name: toTitleCase(p.name),
        designation: p.designation?.trim() ? toTitleCase(p.designation) : undefined,
        phone: p.phone.trim() ? formatIndianPhoneNumber(p.phone) : "",
      }));

    setSaving(true);
    try {
      await updateServiceCenter(center.id, {
        name: toTitleCase(name),
        phone: generalPhone.trim() ? formatIndianPhoneNumber(generalPhone) : undefined,
        whatsappPhone: whatsappPhone.trim() ? formatIndianPhoneNumber(whatsappPhone) : undefined,
        email: email.trim().toLowerCase() || undefined,
        addresses: cleanAddresses,
        pocs: cleanPocs,
        active,
      });

      toast.success("Service Center updated");
      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating service center:", err);
      toast.error(err?.message || "Failed to update service center");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
            <Building2 className="h-5 w-5 text-[#2563EB]" />
            Edit Service Center
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Service Center Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setName((prev) => toTitleCase(prev))}
                required
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> Default WhatsApp Number (Follow-up)
              </Label>
              <Input
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 dark:text-slate-400">Desk Phone</Label>
              <Input
                value={generalPhone}
                onChange={(e) => setGeneralPhone(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600 dark:text-slate-400">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Multiple Addresses */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#2563EB]" /> Dispatch & Receiving Addresses
              </Label>
              <button
                type="button"
                onClick={handleAddAddress}
                className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                Add Address
              </button>
            </div>

            {addresses.map((addr, idx) => (
              <div key={addr.id || idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <Input
                  placeholder="City"
                  value={addr.city || ""}
                  onChange={(e) => handleUpdateAddress(idx, "city", e.target.value)}
                  className="w-28 h-8 text-xs rounded-lg"
                />
                <Input
                  placeholder="Complete Address..."
                  value={addr.address}
                  onChange={(e) => handleUpdateAddress(idx, "address", e.target.value)}
                  className="flex-1 h-8 text-xs rounded-lg"
                />
                {addresses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAddress(idx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Multiple POCs */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#2563EB]" /> Contact Persons / POCs
              </Label>
              <button
                type="button"
                onClick={handleAddPoc}
                className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                Add POC
              </button>
            </div>

            {pocs.map((poc, idx) => (
              <div key={poc.id || idx} className="grid grid-cols-12 gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 items-center">
                <div className="col-span-4">
                  <Input
                    placeholder="POC Name"
                    value={poc.name}
                    onChange={(e) => handleUpdatePoc(idx, "name", e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Role"
                    value={poc.designation || ""}
                    onChange={(e) => handleUpdatePoc(idx, "designation", e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    placeholder="Mobile"
                    value={poc.phone}
                    onChange={(e) => handleUpdatePoc(idx, "phone", e.target.value)}
                    className="h-8 text-xs rounded-lg font-mono"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  {pocs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePoc(idx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Status</Label>
              <p className="text-[11px] text-slate-500">Enable or disable for parcel intake selection</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <DialogFooter className="border-t pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-9 text-xs rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
