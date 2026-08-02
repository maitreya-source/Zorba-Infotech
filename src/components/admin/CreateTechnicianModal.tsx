import { useState } from "react";
import { UserCheck, Wrench } from "lucide-react";
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
import { createTechnician } from "@/lib/firestore";
import type { Technician } from "@/lib/types";

interface CreateTechnicianModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (tech: Technician) => void;
}

export default function CreateTechnicianModal({
  open,
  onOpenChange,
  onCreated,
}: CreateTechnicianModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter Technician Name");
      return;
    }

    setSubmitting(true);
    try {
      const newTech = await createTechnician({
        name: name.trim(),
        phone: phone.trim() || undefined,
        specialization: specialization.trim() || "",
        active: true,
      });

      toast.success("Technician added successfully");
      setName("");
      setPhone("");
      setSpecialization("");
      onOpenChange(false);
      if (onCreated) onCreated(newTech);
    } catch {
      toast.error("Failed to add Technician");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <UserCheck className="h-4 w-4" />
            </div>
            Add New Technician / Assignee
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
          <div>
            <Label htmlFor="tech-name" className="text-xs font-semibold">
              Technician Name *
            </Label>
            <Input
              id="tech-name"
              placeholder="e.g. Technician 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-8 text-xs"
              required
            />
          </div>

          <div>
            <Label htmlFor="tech-phone" className="text-xs font-semibold">
              Contact Phone Number <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="tech-phone"
              placeholder="+91 98230 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-8 text-xs font-mono"
            />
          </div>

          <div>
            <Label htmlFor="tech-spec" className="text-xs font-semibold">
              Specialization / Role <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="tech-spec"
              placeholder="e.g. Printer Refill, Laptop Chip Level (Optional)"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
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
              {submitting ? "Saving…" : "Save Technician"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
