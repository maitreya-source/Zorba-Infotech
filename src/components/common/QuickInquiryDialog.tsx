import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Phone, Send, Loader2, MessageCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createInquiry } from "@/lib/firestore";
import { isValidIndianPhoneNumber, formatIndianPhoneNumber, formatPhoneForDisplay } from "@/lib/utils";
import { whatsappLink } from "@/lib/contact";

interface QuickInquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProduct?: string;
  defaultCategory?: string;
  source?: string;
}

export default function QuickInquiryDialog({
  open,
  onOpenChange,
  defaultProduct = "",
  defaultCategory = "",
  source = "landing_quick_inquiry",
}: QuickInquiryDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");

  // Initialize or reset when dialog opens
  useEffect(() => {
    if (open) {
      setSubmitted(false);
      if (defaultProduct) {
        setSubject(`Inquiry: ${defaultProduct}`);
        setMessage(`Hi, I would like to know pricing and availability for ${defaultProduct}.`);
      } else if (defaultCategory) {
        setSubject(`Inquiry: ${defaultCategory}`);
        setMessage(`Hi, I would like to inquire about products under ${defaultCategory}.`);
      } else {
        setSubject("");
        setMessage("");
      }
    }
  }, [open, defaultProduct, defaultCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    if (!isValidIndianPhoneNumber(phone)) {
      toast.error("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter your inquiry requirement.");
      return;
    }

    setSubmitting(true);
    try {
      const formattedPhone = formatIndianPhoneNumber(phone);
      await createInquiry({
        name: name.trim(),
        phone: formattedPhone,
        subject: subject.trim() || undefined,
        message: message.trim(),
        source,
        status: "pending",
      });

      setSubmittedPhone(formattedPhone);
      setSubmitted(true);
      toast.success("Inquiry submitted successfully!");
    } catch (err: any) {
      console.error("Failed to submit quick inquiry:", err);
      toast.error(err?.message || "Failed to submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/80 p-6 rounded-2xl shadow-xl">
        {!submitted ? (
          <>
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="text-xl font-bold font-display text-foreground">
                {defaultProduct ? `Inquire About ${defaultProduct}` : "Quick Product & Price Inquiry"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Leave your details below and our team will get back to you with pricing &amp; availability.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-3">
              <div className="space-y-1.5">
                <Label htmlFor="inq-name" className="text-xs font-semibold">
                  Your Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inq-name"
                  type="text"
                  placeholder="e.g. FirstName LastName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inq-phone" className="text-xs font-semibold">
                  10-Digit Mobile / WhatsApp Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground text-xs font-semibold pointer-events-none">
                    <span>🇮🇳 +91</span>
                  </div>
                  <Input
                    id="inq-phone"
                    type="tel"
                    placeholder="99935 99730"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 rounded-xl pl-16 font-mono text-sm"
                    maxLength={14}
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  We'll call or WhatsApp you directly on this number.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inq-msg" className="text-xs font-semibold">
                  Requirement / Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="inq-msg"
                  rows={3}
                  placeholder="Tell us what you're looking for (e.g. RAM upgrade, HP laptop price, CCTV installation)..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl resize-none text-sm"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 rounded-xl h-10 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl h-10 font-semibold gap-2 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Inquiry
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold font-display text-foreground">
                Inquiry Received!
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Thank you <strong>{name}</strong>. Our team will contact you at{" "}
                <span className="font-mono font-semibold text-foreground">
                  {formatPhoneForDisplay(submittedPhone)}
                </span>{" "}
                shortly.
              </p>
            </div>

            <div className="rounded-xl border bg-secondary/40 p-3 text-xs text-muted-foreground">
              📍 <strong>Zorba Infotech</strong>, Shop No. 5 &amp; 6, U-Shape Market, Tagore Marg, Neemuch.
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={whatsappLink(
                  `Hi Zorba Infotech! I just submitted an inquiry for "${subject || "IT Hardware"}" on your website.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="whatsapp" className="w-full rounded-xl gap-2 h-10 font-semibold">
                  <MessageCircle className="h-4 w-4" />
                  Connect on WhatsApp (Optional)
                </Button>
              </a>

              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full rounded-xl h-10 font-semibold"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
