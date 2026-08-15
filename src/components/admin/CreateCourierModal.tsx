import { useState } from "react";
import { toast } from "sonner";
import { Truck } from "lucide-react";
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
import { createCourier } from "@/lib/firestore";
import { toTitleCase, formatIndianPhoneNumber } from "@/lib/utils";
import type { Courier } from "@/lib/types";

interface CreateCourierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (courier: Courier) => void;
}

export default function CreateCourierModal({
  open,
  onOpenChange,
  onCreated,
}: CreateCourierModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Courier name is required");
      return;
    }

    setSaving(true);
    try {
      const newCourier = await createCourier({
        name: toTitleCase(name),
        phone: phone.trim() ? formatIndianPhoneNumber(phone) : undefined,
        contactPerson: contactPerson.trim() ? toTitleCase(contactPerson) : undefined,
        active: true,
      });

      toast.success(`Courier "${newCourier.name}" added successfully`);
      if (onCreated) onCreated(newCourier);
      onOpenChange(false);
      setName("");
      setPhone("");
      setContactPerson("");
    } catch (err: any) {
      console.error("Error creating courier:", err);
      toast.error(err?.message || "Failed to create courier");
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
            Add Courier & Logistics Partner
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Courier Partner Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Trackon Courier / Reliance Logistics"
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
              Used by backoffice staff to send one-click shipment tracking follow-up WhatsApp messages
            </p>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Contact Person / Hub Executive
            </Label>
            <Input
              placeholder="e.g. Local Booking Counter / Sunil Dispatcher"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="mt-1.5 h-9 text-xs rounded-xl"
            />
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
              {saving ? "Saving..." : "Add Courier Partner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
