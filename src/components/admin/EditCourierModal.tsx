import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck } from "lucide-react";
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
import { updateCourier } from "@/lib/firestore";
import { toTitleCase, formatIndianPhoneNumber } from "@/lib/utils";
import type { Courier } from "@/lib/types";

interface EditCourierModalProps {
  courier: Courier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export default function EditCourierModal({
  courier,
  open,
  onOpenChange,
  onUpdated,
}: EditCourierModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (courier) {
      setName(courier.name || "");
      setPhone(courier.phone || "");
      setContactPerson(courier.contactPerson || "");
      setTrackingUrlTemplate(courier.trackingUrlTemplate || "");
      setActive(courier.active !== false);
    }
  }, [courier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courier) return;
    if (!name.trim()) {
      toast.error("Courier name is required");
      return;
    }

    setSaving(true);
    try {
      await updateCourier(courier.id, {
        name: toTitleCase(name),
        phone: phone.trim() ? formatIndianPhoneNumber(phone) : undefined,
        contactPerson: contactPerson.trim() ? toTitleCase(contactPerson) : undefined,
        trackingUrlTemplate: trackingUrlTemplate.trim() || undefined,
        active,
      });

      toast.success(`Courier "${name}" updated successfully`);
      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating courier:", err);
      toast.error(err?.message || "Failed to update courier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
            <Truck className="h-5 w-5 text-[#2563EB]" />
            Edit Courier & Logistics Partner
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Courier Partner Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Trackon Courier"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1.5 h-9 text-xs rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Follow-Up Phone / WhatsApp Number
            </Label>
            <Input
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 h-9 text-xs rounded-xl font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used by backoffice staff for 1-click WhatsApp shipment tracking inquiries
            </p>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Contact Person / Hub Executive
            </Label>
            <Input
              placeholder="e.g. Booking Counter / Sunil Dispatcher"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="mt-1.5 h-9 text-xs rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Online Tracking URL Template (Optional)
            </Label>
            <Input
              placeholder="e.g. https://trackon.in/track/{docket}"
              value={trackingUrlTemplate}
              onChange={(e) => setTrackingUrlTemplate(e.target.value)}
              className="mt-1.5 h-9 text-xs rounded-xl font-mono"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60">
            <div>
              <Label className="text-xs font-bold text-slate-900 dark:text-white">Active Status</Label>
              <p className="text-[10px] text-slate-400">Enable to show in Service Call logistics dropdowns</p>
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
