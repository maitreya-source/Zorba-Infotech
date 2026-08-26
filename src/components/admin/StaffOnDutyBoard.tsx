import { useState } from "react";
import { Users, CheckCircle2, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { OnlineStaffDutyMember } from "@/lib/realtimeSync";

interface StaffOnDutyBoardProps {
  onlineStaff: OnlineStaffDutyMember[];
}

export default function StaffOnDutyBoard({ onlineStaff }: StaffOnDutyBoardProps) {
  const [showModal, setShowModal] = useState(false);
  const count = onlineStaff.length;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
          count > 0
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
            : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800"
        }`}
        title="View live staff on duty board"
      >
        <span className="relative flex h-2 w-2">
          {count > 0 && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${count > 0 ? "bg-emerald-400" : "bg-slate-500"}`}></span>
        </span>
        <span className="font-mono">{count}</span>
        <span className="hidden sm:inline">On Duty</span>
        <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
      </button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                    Live Staff On Duty
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    Logged in on shop terminals
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-mono text-xs">
                {count} Online
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {count === 0 ? (
              <div className="text-center py-6 text-slate-400 space-y-1">
                <p className="font-medium text-xs">No staff currently active on shop network.</p>
                <p className="text-[11px] text-slate-500">Staff will appear here automatically when they open the ERP.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {onlineStaff.map((staff) => (
                  <div
                    key={staff.staffId}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {staff.name}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Online
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Automatic real-time heartbeat</span>
              <span className="font-mono text-[10px] text-slate-500">Firebase RTDB</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
