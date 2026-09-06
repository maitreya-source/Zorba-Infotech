import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Loader2, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StateSelect from "@/components/admin/StateSelect";
import { DEFAULT_INDIAN_STATE } from "@/lib/constants";
import { updateServiceCenter } from "@/lib/firestore";
import { formatFullAddress } from "@/lib/utils";
import type { ServiceCenter, ServiceCenterAddress } from "@/lib/types";

interface AddServiceCenterAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceCenter: ServiceCenter | null;
  onAddressAdded: (newAddress: ServiceCenterAddress, serviceCenterId: string) => void;
  onOpenEditCenterModal?: () => void;
}

export default function AddServiceCenterAddressModal({
  open,
  onOpenChange,
  serviceCenter,
  onAddressAdded,
  onOpenEditCenterModal,
}: AddServiceCenterAddressModalProps) {
  const [city, setCity] = useState("");
  const [lines, setLines] = useState<string[]>(["", ""]);
  const [state, setState] = useState(DEFAULT_INDIAN_STATE);
  const [pincode, setPincode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleReset = () => {
    setCity("");
    setLines(["", ""]);
    setState(DEFAULT_INDIAN_STATE);
    setPincode("");
    setSaving(false);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleLineChange = (index: number, value: string) => {
    // If user pastes multi-line text into any line, split automatically
    if (value.includes("\n")) {
      const pasted = value.split("\n").map((l) => l.trim()).filter(Boolean);
      if (pasted.length > 1) {
        setLines((prev) => {
          const next = [...prev];
          next.splice(index, 1, ...pasted);
          const clean = next.filter((l, i) => i === 0 || l.trim().length > 0);
          if (clean.length < 2) clean.push("");
          return clean;
        });
        return;
      }
    }

    setLines((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddLine = () => {
    if (lines.length >= 4) {
      toast.info("Maximum 4 address lines per hub");
      return;
    }
    setLines((prev) => [...prev, ""]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) next.push("");
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceCenter) {
      toast.error("No service center selected");
      return;
    }

    if (!city.trim()) {
      toast.error("Please enter the city for this dispatch address");
      return;
    }

    const cleanLines = lines.map((l) => l.trim()).filter(Boolean);
    if (cleanLines.length === 0) {
      toast.error("Please enter at least Address Line 1 / building details");
      return;
    }

    setSaving(true);
    try {
      const fullAddressStr = formatFullAddress({
        lines: cleanLines,
        city: city.trim(),
        state,
        pincode: pincode.trim(),
      });

      const newAddress: ServiceCenterAddress = {
        id: `addr-${Date.now()}`,
        city: city.trim(),
        address: fullAddressStr,
        lines: cleanLines,
        state,
        pincode: pincode.trim(),
        isDefault: false,
      };

      const existingAddresses = serviceCenter.addresses || [];
      const updatedAddresses = [...existingAddresses, newAddress];

      await updateServiceCenter(serviceCenter.id, {
        addresses: updatedAddresses,
      });

      toast.success(`Dispatch address added to ${serviceCenter.name}`);
      onAddressAdded(newAddress, serviceCenter.id);
      handleClose();
    } catch (err) {
      console.error("Failed to add dispatch address:", err);
      toast.error("Could not save dispatch address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(true))}>
      <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <span>Add Dispatch Address</span>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                {serviceCenter ? `Hub for ${serviceCenter.name}` : "New service center dispatch hub"}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* City & State Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                City <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Indore, Bhopal"
                required
                className="h-10 rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                State
              </Label>
              <StateSelect
                value={state}
                onChange={setState}
                className="h-10 rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
              />
            </div>
          </div>

          {/* Multi-Line Address Rows (Matching Service Center multi-line address) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Multi-Line Address Details <span className="text-rose-500">*</span>
              </Label>
              {lines.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Line</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {lines.map((line, lIdx) => (
                <div key={lIdx} className="flex items-center gap-2">
                  <Input
                    value={line}
                    onChange={(e) => handleLineChange(lIdx, e.target.value)}
                    placeholder={
                      lIdx === 0
                        ? "Line 1: Shop No, Floor, Building / Mall (Required)"
                        : lIdx === 1
                        ? "Line 2: Street, Road, Landmark (e.g. Near Vijay Nagar Square)"
                        : `Line ${lIdx + 1}: Area / Additional details`
                    }
                    required={lIdx === 0}
                    className="h-9 rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium text-xs flex-1"
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(lIdx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove Line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              Paste full address text above to automatically split across lines.
            </p>
          </div>

          {/* Pincode */}
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Pincode
            </Label>
            <Input
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="452010"
              maxLength={6}
              className="h-10 rounded-xl bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-medium font-mono text-xs w-36"
            />
          </div>

          {/* Alternative option to open full edit service center */}
          {onOpenEditCenterModal && serviceCenter && (
            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                Want to manage all hub locations & POC contacts?
              </span>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenEditCenterModal();
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Edit2 className="h-3 w-3" />
                <span>Open Full Editor</span>
              </button>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-10 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-10 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 cursor-pointer gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Save & Select Address</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
