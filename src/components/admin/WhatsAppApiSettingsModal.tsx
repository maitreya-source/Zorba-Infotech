import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Key,
  Phone,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  HelpCircle,
} from "lucide-react";
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
import {
  getWhatsAppApiConfig,
  saveWhatsAppApiConfig,
  testWhatsAppApiConnection,
  type WhatsAppApiConfig,
} from "@/lib/whatsappApi";

interface WhatsAppApiSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WhatsAppApiSettingsModal({
  open,
  onOpenChange,
}: WhatsAppApiSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Form State
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [autoFallbackToWeb, setAutoFallbackToWeb] = useState(true);
  const [verifiedBusinessName, setVerifiedBusinessName] = useState("Zorba Infotech");

  // Testing State
  const [testPhone, setTestPhone] = useState("+91 ");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setTestResult(null);
      getWhatsAppApiConfig()
        .then((cfg) => {
          setAccessToken(cfg.accessToken || "");
          setPhoneNumberId(cfg.phoneNumberId || "");
          setWabaId(cfg.wabaId || "");
          setEnabled(cfg.enabled);
          setAutoFallbackToWeb(cfg.autoFallbackToWeb);
          setVerifiedBusinessName(cfg.verifiedBusinessName || "Zorba Infotech");
        })
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveWhatsAppApiConfig({
        accessToken: accessToken.trim(),
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim(),
        enabled,
        autoFallbackToWeb,
        verifiedBusinessName: verifiedBusinessName.trim(),
      });
      toast.success("WhatsApp Cloud API settings saved successfully!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save WhatsApp settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestPing = async () => {
    if (!accessToken.trim() || !phoneNumberId.trim()) {
      toast.error("Please enter your Meta Access Token and Phone Number ID first.");
      return;
    }
    if (!testPhone.trim() || testPhone.trim() === "+91") {
      toast.error("Please enter a valid phone number to receive the test message.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testWhatsAppApiConnection(
        testPhone,
        accessToken.trim(),
        phoneNumberId.trim()
      );
      setTestResult(res);
      toast.success("Verified! Test message delivered to your WhatsApp.");
    } catch (err: any) {
      const errorMsg = err?.message || "Connection test failed";
      setTestResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = Boolean(accessToken.trim() && phoneNumberId.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Meta WhatsApp Cloud API Settings</span>
                  {isConfigured ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Pending Token
                    </span>
                  )}
                </DialogTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Configure direct programmatic messaging without browser redirects
                </p>
              </div>
            </div>

            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Meta Portal</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Quick Notice Card */}
          <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-800/80 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
              <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Direct Meta Cloud API Integration</span>
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-300/90 leading-relaxed">
              When configured, service call alerts will deliver straight to customers in the background. The first <strong>1,000 service conversations/month are 100% free</strong> from Meta.
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            {/* Meta Access Token */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-blue-600" />
                  Meta System User / Access Token
                </Label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showToken ? "Hide" : "Show"}</span>
                </button>
              </div>
              <Input
                type={showToken ? "text" : "password"}
                placeholder="EAA..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="h-9 text-xs rounded-xl font-mono bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
              <p className="text-[10px] text-slate-400">
                Generated from Meta Business Settings ➔ System Users (with <code className="text-blue-500">whatsapp_business_messaging</code> scope).
              </p>
            </div>

            {/* Phone Number ID & WABA ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  Phone Number ID
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 105934892348912"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-600" />
                  WABA Account ID (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 293847293847293"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                    Enable Direct Cloud API
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Send messages directly via Meta's servers instead of redirecting
                  </span>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                    Auto-Fallback to WhatsApp Web
                  </span>
                  <span className="text-[10px] text-slate-400">
                    If API token expires or recipient is unverified, seamlessly open WhatsApp Web
                  </span>
                </div>
                <Switch checked={autoFallbackToWeb} onCheckedChange={setAutoFallbackToWeb} />
              </div>
            </div>
          </div>

          {/* Test Connection Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Test Connection Live
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="+91 98765 43210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="h-9 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestPing}
                disabled={testing || !accessToken.trim() || !phoneNumberId.trim()}
                className="h-9 px-3 text-xs font-semibold rounded-xl gap-1.5 shrink-0 cursor-pointer"
              >
                {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 text-emerald-600" />}
                <span>{testing ? "Testing..." : "Send Test Ping"}</span>
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-[11px] flex items-start gap-2 border ${
                  testResult.success
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span className="leading-snug">{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-bold rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white shadow-xs gap-1.5 cursor-pointer px-4"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Configuration</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
