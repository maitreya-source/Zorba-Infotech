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

      const loadedAddresses = center.addresses?.length
        ? center.addresses.map((a, i) => {
            let lines = a.lines && a.lines.length > 0 ? [...a.lines] : (a.address || "").split("\n");
            if (lines.length === 1) {
              lines.push("");
            }
            return {
              ...a,
              lines,
              isDefault: a.isDefault ?? i === 0,
            };
          })
        : [{ id: `addr-1`, city: "Indore", address: "", lines: ["", ""], isDefault: true }];

      setAddresses(loadedAddresses);
      setPocs(center.pocs?.length ? center.pocs : [{ id: `poc-1`, name: "", designation: "RMA Coordinator", phone: "", isWhatsApp: true }]);
    }
  }, [center]);

  const handleAddAddress = () => {
    setAddresses((prev) => [
      ...prev,
      { id: `addr-${Date.now()}`, city: "", address: "", lines: ["", ""], isDefault: false },
    ]);
  };

  const handleRemoveAddress = (idx: number) => {
    setAddresses((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateAddressCity = (idx: number, city: string) => {
    setAddresses((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], city };
      return copy;
    });
  };

  const handleUpdateAddressLine = (addrIdx: number, lineIdx: number, val: string) => {
    setAddresses((prev) => {
      const copy = [...prev];
      const target = { ...copy[addrIdx] };
      const currentLines = [...(target.lines || ["", ""])];

      // If user pastes multi-line text into an input, split it across lines automatically
      if (val.includes("\n")) {
        const pasted = val.split("\n").map((l) => l.trim()).filter(Boolean);
        if (pasted.length > 1) {
          currentLines.splice(lineIdx, 1, ...pasted);
          const clean = currentLines.filter((l, i) => i === 0 || l.trim().length > 0);
          if (clean.length < 2) clean.push("");
          target.lines = clean;
          target.address = clean.filter(Boolean).join("\n");
          copy[addrIdx] = target;
          return copy;
        }
      }

      currentLines[lineIdx] = val;
      target.lines = currentLines;
      target.address = currentLines.filter(Boolean).join("\n");
      copy[addrIdx] = target;
      return copy;
    });
  };

  const handleAddAddressLine = (addrIdx: number) => {
    setAddresses((prev) => {
      const copy = [...prev];
      const target = { ...copy[addrIdx] };
      const currentLines = [...(target.lines || ["", ""])];
      currentLines.push("");
      target.lines = currentLines;
      copy[addrIdx] = target;
      return copy;
    });
  };

  const handleRemoveAddressLine = (addrIdx: number, lineIdx: number) => {
    setAddresses((prev) => {
      const copy = [...prev];
      const target = { ...copy[addrIdx] };
      const currentLines = (target.lines || ["", ""]).filter((_, i) => i !== lineIdx);
      if (currentLines.length === 0) currentLines.push("");
      target.lines = currentLines;
      target.address = currentLines.filter(Boolean).join("\n");
      copy[addrIdx] = target;
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

    // Validate that Address Line 1 is filled for every registered address
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      const line1 = addr.lines?.[0]?.trim() || addr.address?.trim() || "";
      if (!line1) {
        toast.error(`Address ${i + 1}: Address Line 1 is required`);
        return;
      }
    }

    const cleanAddresses: ServiceCenterAddress[] = addresses.map((a, idx) => {
      const rawLines = a.lines && a.lines.length > 0 ? a.lines : [a.address || ""];
      const validLines = rawLines
        .map((l) => toTitleCase(l.trim()))
        .filter(Boolean);
      return {
        id: a.id || `addr-${idx + 1}`,
        city: a.city?.trim() ? toTitleCase(a.city) : undefined,
        lines: validLines,
        address: validLines.join("\n"),
        isDefault: a.isDefault ?? idx === 0,
      };
    });

    if (cleanAddresses.length === 0) {
      toast.error("Please add at least one valid address");
      return;
    }

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
        defaultAddressId: cleanAddresses[0]?.id,
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

          {/* Multiple Addresses with Multi-line Option */}
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#2563EB]" /> Dispatch & Receiving Addresses
                </Label>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Line 1 is mandatory. Additional address lines are optional.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAddress}
                className="h-7 px-2.5 text-[11px] font-bold text-[#2563EB] hover:text-blue-700 border-blue-200 dark:border-blue-900 cursor-pointer"
              >
                + Add Another Hub / City
              </Button>
            </div>

            {addresses.map((addr, idx) => (
              <div
                key={addr.id || idx}
                className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                {/* Header bar of Address card */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Location #{idx + 1}
                    </span>
                    {idx === 0 ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Default Hub
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[10.5px] font-semibold text-slate-500">City:</Label>
                      <Input
                        placeholder="e.g. Indore / Delhi"
                        value={addr.city || ""}
                        onChange={(e) => handleUpdateAddressCity(idx, e.target.value)}
                        className="w-32 h-7 text-xs rounded-lg bg-white dark:bg-slate-950"
                      />
                    </div>
                    {addresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAddress(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        title="Delete this address"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Multi-line address fields */}
                <div className="space-y-2">
                  {/* Address Line 1 (Mandatory) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Address Line 1 <span className="text-red-500 font-bold">*</span>
                      </Label>
                      <span className="text-[9.5px] text-slate-400">
                        Building / Shop No. / Floor / Street (Required)
                      </span>
                    </div>
                    <Input
                      placeholder="e.g. Shop No. 5 & 6, Ground Floor, U-Shape Market"
                      value={addr.lines?.[0] ?? ""}
                      onChange={(e) => handleUpdateAddressLine(idx, 0, e.target.value)}
                      required
                      className="h-8 text-xs rounded-lg bg-white dark:bg-slate-950"
                    />
                  </div>

                  {/* Address Line 2 (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Address Line 2 <span className="text-slate-400 font-normal">(Optional)</span>
                      </Label>
                      <span className="text-[9.5px] text-slate-400">
                        Landmark / Road / Area / Sector
                      </span>
                    </div>
                    <Input
                      placeholder="e.g. Tagore Marg, Opp. Old Municipality"
                      value={addr.lines?.[1] ?? ""}
                      onChange={(e) => handleUpdateAddressLine(idx, 1, e.target.value)}
                      className="h-8 text-xs rounded-lg bg-white dark:bg-slate-950"
                    />
                  </div>

                  {/* Address Line 3+ (Additional Optional Lines) */}
                  {(addr.lines || []).slice(2).map((extraLine, lineIdx) => {
                    const actualLineIdx = lineIdx + 2;
                    return (
                      <div key={actualLineIdx} className="space-y-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Address Line {actualLineIdx + 1}{" "}
                            <span className="text-slate-400 font-normal">(Optional)</span>
                          </Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            placeholder="e.g. Industrial Area / Pincode"
                            value={extraLine}
                            onChange={(e) =>
                              handleUpdateAddressLine(idx, actualLineIdx, e.target.value)
                            }
                            className="flex-1 h-8 text-xs rounded-lg bg-white dark:bg-slate-950"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAddressLine(idx, actualLineIdx)}
                            className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                            title="Remove this line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleAddAddressLine(idx)}
                      className="text-[11px] font-semibold text-[#2563EB] hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      + Add Another Line
                    </button>
                  </div>
                </div>
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
