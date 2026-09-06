import { useState } from "react";
import { Keyboard, Command, Zap, ListTree, FileEdit, Compass } from "lucide-react";
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

interface ShortcutItem {
  action: string;
  keys: string;
  macKeys?: string;
  desc: string;
  badge?: string;
}

interface ShortcutCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  shortcuts: ShortcutItem[];
}

const CATEGORIES: ShortcutCategory[] = [
  {
    id: "goto",
    title: "Tally 'Go To' Chords",
    icon: Compass,
    description: "Sequential 2-stroke jumps. Press G, release, then hit the module key:",
    shortcuts: [
      {
        action: "Go to Service Calls",
        keys: "G → S",
        desc: "Jump straight to active service calls register",
        badge: "Tally",
      },
      {
        action: "Go to Quotations",
        keys: "G → Q",
        desc: "Jump straight to quotations & estimates",
        badge: "Tally",
      },
      {
        action: "Go to Products / Inventory",
        keys: "G → P",
        desc: "Catalog & warehouse stock inventory",
      },
      {
        action: "Go to Customers",
        keys: "G → C",
        desc: "Customer ledger and directory",
      },
      {
        action: "Go to Reports & Analytics",
        keys: "G → R",
        desc: "Financial analytics and operational reports",
      },
      {
        action: "Go to Inward Register",
        keys: "G → I",
        desc: "Customer device inward logs",
      },
      {
        action: "Go to Delivery Challan",
        keys: "G → J",
        desc: "Ready delivery dispatch vouchers",
      },
      {
        action: "Go to Team / Staff",
        keys: "G → T",
        desc: "Technicians and staff accounts",
      },
      {
        action: "Go to Settings",
        keys: "G → W",
        desc: "Store master configuration & backup",
      },
      {
        action: "Toggle 'Go To' Quick Menu",
        keys: "Alt + G",
        macKeys: "⌥ + G",
        desc: "Opens the Tally Go To floating chord HUD",
      },
    ],
  },
  {
    id: "lists",
    title: "List & Table Navigation",
    icon: ListTree,
    description: "Browse registers and manage records without touching the mouse:",
    shortcuts: [
      {
        action: "Move Row Cursor Highlight",
        keys: "↑ / ↓",
        desc: "Move active selection cursor up and down rows",
      },
      {
        action: "Open / Edit Highlighted Item",
        keys: "Enter",
        desc: "Opens the currently highlighted service call or quote",
        badge: "Fast",
      },
      {
        action: "Quick Focus Search Bar",
        keys: "/",
        desc: "Instantly focus search; press ↓ to jump back into list",
      },
      {
        action: "Previous / Next Page",
        keys: "[  /  ]  or  PgUp / PgDn",
        desc: "Flip through paginated registers",
      },
      {
        action: "Create New Record",
        keys: "Alt + A",
        macKeys: "⌥ + A",
        desc: "Opens blank ticket or quotation form",
      },
      {
        action: "Print / PDF Highlighted Row",
        keys: "Alt + P",
        macKeys: "⌥ + P",
        desc: "Generates job sheet or formal quotation PDF",
      },
      {
        action: "WhatsApp Highlighted Row",
        keys: "Alt + W",
        macKeys: "⌥ + W",
        desc: "Dispatches WhatsApp status message or quote",
      },
      {
        action: "Delete Highlighted Record",
        keys: "Alt + D",
        macKeys: "⌥ + D",
        desc: "Opens confirmation dialog for highlighted item",
      },
    ],
  },
  {
    id: "forms",
    title: "Voucher & Form Fast Entry",
    icon: FileEdit,
    description: "High-speed counter data entry calibrated for showroom staff:",
    shortcuts: [
      {
        action: "Advance to Next Field",
        keys: "Enter",
        desc: "Advances cursor to next input without submitting",
        badge: "Tally",
      },
      {
        action: "Move to Previous Field",
        keys: "Shift + Enter",
        desc: "Steps cursor back to previous input field",
      },
      {
        action: "Accept & Save Voucher",
        keys: "Ctrl + A  /  Ctrl + S",
        macKeys: "⌘ + A  /  ⌘ + S",
        desc: "Instantly saves voucher data from inside any input",
        badge: "Tally",
      },
      {
        action: "Rapid Line Item Entry",
        keys: "Enter (on Rate/Price)",
        desc: "Pressing Enter on unit price appends next row and focuses product search",
        badge: "Auto",
      },
      {
        action: "Add New Line Item Row",
        keys: "Alt + A",
        macKeys: "⌥ + A",
        desc: "Appends blank row in parts or quotation items table",
      },
      {
        action: "Cycle Workflow Mode",
        keys: "Alt + ← / →",
        macKeys: "⌥ + ← / →",
        desc: "Switches between In-House, Service Center, and Onsite tabs",
      },
      {
        action: "Back / Cancel Form",
        keys: "Esc",
        desc: "Returns to list (prompts if unsaved changes exist)",
      },
    ],
  },
  {
    id: "general",
    title: "Global & Search",
    icon: Zap,
    description: "Omnisearch and dialog management across all modules:",
    shortcuts: [
      {
        action: "Omnisearch (Tickets, Serials, Clients)",
        keys: "Ctrl + K",
        macKeys: "⌘ + K",
        desc: "Instant fuzzy lookup across entire database",
      },
      {
        action: "Shortcuts Help",
        keys: "?",
        desc: "Toggles this keyboard shortcut cheatsheet",
      },
      {
        action: "Close Dialog / Modal",
        keys: "Esc",
        desc: "Dismisses active modal or drawer",
      },
    ],
  },
];

export default function ShortcutsHelpModal({ open, onOpenChange }: ShortcutsHelpModalProps) {
  const [activeTab, setActiveTab] = useState<string>("goto");

  const currentCategory = CATEGORIES.find((c) => c.id === activeTab) || CATEGORIES[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 font-display text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>Tally ERP Keyboard Shortcuts</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    High Speed
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Operate counter workflows without touching the mouse
                </p>
              </div>
            </DialogTitle>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeTab === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {category.title}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {currentCategory.description}
          </p>

          <div className="rounded-xl border divide-y overflow-hidden text-xs bg-background">
            {currentCategory.shortcuts.map((item) => (
              <div
                key={item.action}
                className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{item.action}</p>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right flex flex-col items-end gap-1">
                    <kbd className="px-2.5 py-1 rounded-md border bg-muted/80 font-mono text-xs font-bold shadow-xs text-foreground tracking-wide">
                      {item.keys}
                    </kbd>
                    {item.macKeys && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>Mac:</span>
                        <kbd className="px-1.5 py-0.5 rounded border bg-muted/40 font-mono text-[10px] font-semibold text-primary">
                          {item.macKeys}
                        </kbd>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2.5">
            <Command className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="leading-snug">
              <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-blue-500/20 font-mono font-bold text-[10px]">G</kbd> from anywhere outside text fields to invoke the Tally Go To HUD, or press <kbd className="px-1.5 py-0.5 rounded bg-blue-500/20 font-mono font-bold text-[10px]">?</kbd> for help.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
