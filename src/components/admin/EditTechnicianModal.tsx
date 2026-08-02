import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserCheck, Wrench, Phone } from "lucide-react";
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
import { updateTechnician } from "@/lib/firestore";
import type { Technician } from "@/lib/types";

interface EditTechnicianModalProps {
  technician: Technician | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export default function EditTechnicianModal({
  technician,
  open,
  onOpenChange,
  onUpdated,
}: EditTechnicianModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (technician) {
      setName(technician.name || "");
      setPhone(technician.phone || "");
      setSpecialization(technician.specialization || "");
      setActive(technician.active !== false);
    }
  }, [technician]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technician) return;
    if (!name.trim()) {
      toast.error("Technician name is required");
      return;
    }

    setSaving(true);
    try {
      await updateTechnician(technician.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        specialization: specialization.trim() || "",
        active,
      });

      toast.success("Technician updated successfully");
      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating technician:", err);
      toast.error(err?.message || "Failed to update technician");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-base">
            <UserCheck className="h-5 w-5 text-blue-500" />
            Edit Technician Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div>
            <Label htmlFor="edit-tech-name" className="text-xs font-semibold">
              Technician Name *
            </Label>
            <Input
              id="edit-tech-name"
              placeholder="e.g. Technician 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 h-8 text-xs"
            />
          </div>

          <div>
            <Label htmlFor="edit-tech-phone" className="text-xs font-semibold">
              Contact Phone Number <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="edit-tech-phone"
              placeholder="+91 98230 11111"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-8 text-xs font-mono"
            />
          </div>

          <div>
            <Label htmlFor="edit-tech-spec" className="text-xs font-semibold">
              Specialization / Role <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="edit-tech-spec"
              placeholder="e.g. Printer Refill & Laptop Repair (Optional)"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 border-t pt-3">
            <input
              type="checkbox"
              id="tech-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="tech-active" className="text-xs font-semibold cursor-pointer">
              Active Status (Visible in Service Call Assignee Dropdown)
            </Label>
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
