import { Keyboard, Command } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  {
    action: "Create New Ticket",
    win: "Alt + A",
    mac: "⌥ Option + A",
    desc: "Opens the service call ticket entry form",
  },
  {
    action: "Add New Customer",
    win: "Alt + C",
    mac: "⌥ Option + C",
    desc: "Opens the fast customer creation popup",
  },
  {
    action: "Delete Selected Ticket",
    win: "Alt + D",
    mac: "⌥ Option + D",
    desc: "Triggers deletion dialog for highlighted call",
  },
  {
    action: "Save Ticket Form",
    win: "Ctrl + A",
    mac: "⌘ Cmd + A",
    desc: "Submits and saves active form data",
  },
  {
    action: "Back / Cancel / Close",
    win: "Esc",
    mac: "Esc",
    desc: "Closes modal dialog or navigates back",
  },
  {
    action: "Focus Date Field",
    win: "F2",
    mac: "F2",
    desc: "Quickly jumps cursor to the date picker",
  },
];

export default function ShortcutsHelpModal({ open, onOpenChange }: ShortcutsHelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Keyboard className="h-4 w-4" />
            </div>
            Keyboard Shortcuts Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fast keyboard navigation for Windows and macOS. Use these shortcuts across the Service Call ERP modules.
          </p>

          <div className="rounded-xl border divide-y overflow-hidden text-xs">
            {SHORTCUTS.map((item) => (
              <div key={item.action} className="flex items-center justify-between p-3 bg-card hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground">{item.action}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Win:</span>
                      <kbd className="px-2 py-0.5 rounded border bg-muted font-mono text-[11px] font-bold shadow-xs">
                        {item.win}
                      </kbd>
                    </div>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Mac:</span>
                      <kbd className="px-2 py-0.5 rounded border bg-muted font-mono text-[11px] font-bold shadow-xs text-primary">
                        {item.mac}
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Command className="h-4 w-4 shrink-0 text-blue-600" />
            <span>On macOS keyboards, <strong>Alt</strong> corresponds to the <strong>⌥ Option</strong> key.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
