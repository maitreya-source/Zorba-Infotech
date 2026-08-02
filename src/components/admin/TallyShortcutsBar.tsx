import { Command } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TallyShortcutsBar() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card/80 p-2.5 text-xs text-muted-foreground shadow-sm mb-4">
      <div className="flex items-center gap-1.5 font-semibold text-foreground mr-1">
        <Command className="h-3.5 w-3.5 text-primary" />
        <span>Tally Shortcuts:</span>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="font-mono bg-muted text-[10px] px-1.5 py-0.5">Alt + C</Badge>
        <span>New Customer / Category</span>
      </div>
      <span className="text-muted-foreground/30">•</span>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="font-mono bg-muted text-[10px] px-1.5 py-0.5">Alt + A</Badge>
        <span>Add Call / Part</span>
      </div>
      <span className="text-muted-foreground/30">•</span>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="font-mono bg-muted text-[10px] px-1.5 py-0.5">Ctrl + A</Badge>
        <span>Save (Accept)</span>
      </div>
      <span className="text-muted-foreground/30">•</span>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="font-mono bg-muted text-[10px] px-1.5 py-0.5">Alt + D</Badge>
        <span>Delete Row</span>
      </div>
      <span className="text-muted-foreground/30">•</span>
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="font-mono bg-muted text-[10px] px-1.5 py-0.5">F2</Badge>
        <span>Edit Date</span>
      </div>
    </div>
  );
}
