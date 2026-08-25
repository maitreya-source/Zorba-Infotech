import React, { useEffect, useState } from "react";
import { ShieldCheck, Edit3, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WARRANTY_PERIODS,
  WARRANTY_BY_OPTIONS,
  WARRANTY_TYPE_OPTIONS,
  COMMON_WARRANTY_PRESETS,
  DEFAULT_WARRANTY,
  DEFAULT_WARRANTY_PERIOD,
  DEFAULT_WARRANTY_BY,
  DEFAULT_WARRANTY_TYPE,
  buildWarrantyString,
  parseWarrantyString,
} from "@/lib/constants";

interface WarrantySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  showPresets?: boolean;
}

export default function WarrantySelector({
  value,
  onChange,
  className = "",
  showPresets = true,
}: WarrantySelectorProps) {
  // Parse incoming value on load or external change
  const initialParsed = parseWarrantyString(value || DEFAULT_WARRANTY);
  const [period, setPeriod] = useState<string>(initialParsed.period);
  const [by, setBy] = useState<string>(initialParsed.by);
  const [type, setType] = useState<string>(initialParsed.type);
  const [isCustom, setIsCustom] = useState<boolean>(Boolean(initialParsed.isCustom));
  const [customText, setCustomText] = useState<string>(
    initialParsed.isCustom ? value : ""
  );

  // Sync internal state when external value changes drastically
  useEffect(() => {
    if (!value) {
      setPeriod(DEFAULT_WARRANTY_PERIOD);
      setBy(DEFAULT_WARRANTY_BY);
      setType(DEFAULT_WARRANTY_TYPE);
      setIsCustom(false);
      return;
    }

    const parsed = parseWarrantyString(value);
    if (parsed.isCustom) {
      setIsCustom(true);
      setCustomText(value);
    } else {
      setIsCustom(false);
      setPeriod(parsed.period);
      setBy(parsed.by);
      setType(parsed.type);
    }
  }, [value]);

  const updateStandard = (newPeriod: string, newBy: string, newType: string) => {
    setPeriod(newPeriod);
    setBy(newBy);
    setType(newType);
    setIsCustom(false);
    const nextString = buildWarrantyString({
      period: newPeriod,
      by: newBy,
      type: newType,
      isCustom: false,
    });
    onChange(nextString);
  };

  const handlePeriodChange = (val: string) => {
    updateStandard(val, by, type);
  };

  const handleByChange = (val: string) => {
    updateStandard(period, val, type);
  };

  const handleTypeChange = (val: string) => {
    updateStandard(period, by, val);
  };

  const handleCustomToggle = (customMode: boolean) => {
    setIsCustom(customMode);
    if (customMode) {
      const current = value || buildWarrantyString({ period, by, type });
      setCustomText(current);
      onChange(current);
    } else {
      updateStandard(period, by, type);
    }
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    onChange(text);
  };

  const handleApplyPreset = (preset: typeof COMMON_WARRANTY_PRESETS[0]) => {
    updateStandard(preset.period, preset.by, preset.type);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
          <Label className="text-xs font-bold text-slate-900 dark:text-slate-200">
            Warranty Policy & Terms
          </Label>
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-2 py-0 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
          >
            Auto-Formulated
          </Badge>
        </div>

        {/* Custom Toggle Mode */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Edit3 className="h-3 w-3" /> Custom Text Mode
          </span>
          <Switch
            checked={isCustom}
            onCheckedChange={handleCustomToggle}
            aria-label="Toggle custom warranty text mode"
          />
        </div>
      </div>

      {!isCustom ? (
        /* 3-Part Component Selectors */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Warranty Period */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              1. Warranty Period
            </Label>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {WARRANTY_PERIODS.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p} {p === DEFAULT_WARRANTY_PERIOD ? " (Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Warranty By (Provider) */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              2. Warranty By
            </Label>
            <Select value={by} onValueChange={handleByChange}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent>
                {WARRANTY_BY_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b} className="text-xs">
                    By {b} {b === DEFAULT_WARRANTY_BY ? " (Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Warranty Type (Carry-in / Onsite) */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              3. Warranty Type
            </Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {WARRANTY_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        /* Custom Free-Text Input */
        <div className="space-y-1">
          <Label className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            Custom Warranty Clause
          </Label>
          <Input
            value={customText}
            onChange={(e) => handleCustomTextChange(e.target.value)}
            placeholder="Type custom warranty clause..."
            className="h-9 text-xs rounded-xl bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
          />
        </div>
      )}

      {/* Generated Live Clause Preview / Edit Input */}
      {!isCustom && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">
              Composed Clause (Saved to Product & Invoices):
            </span>
          </div>
          <Input
            value={value}
            onChange={(e) => {
              setIsCustom(true);
              setCustomText(e.target.value);
              onChange(e.target.value);
            }}
            className="h-8 text-[11px] rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300"
          />
        </div>
      )}

      {/* Quick 1-Click Preset Badges */}
      {showPresets && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" /> Presets:
          </span>
          {COMMON_WARRANTY_PRESETS.map((preset) => {
            const presetVal = buildWarrantyString(preset);
            const isSelected = !isCustom && value === presetVal;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#2563EB] text-white border-blue-600 shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 hover:border-blue-300"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
