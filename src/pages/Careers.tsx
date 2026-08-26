import { useState } from "react";
import Layout from "@/components/layout/Layout";
import {
  SEO,
  BreadcrumbSchema,
  JobPostingSchema,
  FAQSchema,
  type JobPostingData,
} from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone,
  MessageCircle,
  MapPin,
  Briefcase,
  Wrench,
  Network,
  Headset,
  CheckCircle2,
  Send,
  Sparkles,
  Loader2,
  Clock,
  GraduationCap,
  Building,
} from "lucide-react";
import { createJobApplication } from "@/lib/firestore";
import { isValidIndianPhoneNumber, formatIndianPhoneNumber } from "@/lib/utils";
import { toast } from "sonner";

const DATE_POSTED = "2026-07-23";
const VALID_THROUGH = "2026-10-31";
const APPLICANT_AREAS = ["Neemuch", "Madhya Pradesh", "Rajasthan"];

const contactNumbers = [
  { label: "Direct Hiring Desk", number: "9993599730" },
  { label: "HR & Support", number: "9302199730" },
  { label: "Technical Operations", number: "9424899730" },
  { label: "Admin Office", number: "9179699730" },
];

const applyText =
  "To apply, call or WhatsApp Zorba Infotech on +91 99935 99730, +91 93021 99730, " +
  "+91 94248 99730 or +91 91796 99730. Walk-in: Shop No. 5 & 6, U-Shape Market, " +
  "Tagore Marg, Neemuch 458441, Madhya Pradesh.";

interface Role {
  icon: typeof Wrench;
  job: JobPostingData;
  responsibilities: string[];
  requirements: string[];
}

const roles: Role[] = [
  {
    icon: Wrench,
    responsibilities: [
      "Assemble custom desktop PCs, gaming rigs and workstations",
      "Install, service & repair laptops, desktops and printers",
      "Component-level fault diagnosis (motherboard, RAM, SSD, SMPS)",
      "OS installation, formatting, data backup & recovery",
    ],
    requirements: [
      "ITI / Diploma or hands-on computer hardware knowledge",
      "Freshers and experienced candidates both welcome",
      "Willingness to learn and provide great customer service",
    ],
    job: {
      slug: "computer-hardware-technician",
      title: "Computer Hardware Technician / Mechanic",
      employmentType: "FULL_TIME",
      datePosted: DATE_POSTED,
      validThrough: VALID_THROUGH,
      applicantAreas: APPLICANT_AREAS,
      description:
        "Zorba Infotech, a leading computer hardware dealer and service centre in Neemuch, " +
        "is hiring a Computer Hardware Technician / Mechanic. Responsibilities include assembling " +
        "custom PCs, installing and repairing laptops, desktops and printers, component-level fault " +
        "diagnosis, OS installation and data recovery. ITI/Diploma or hands-on hardware knowledge " +
        "preferred. Freshers and experienced candidates are both welcome. Salary is as per experience " +
        "and skills. Work location: Neemuch, Madhya Pradesh. Candidates from Neemuch, across Madhya " +
        "Pradesh and Rajasthan may apply. " +
        applyText,
    },
  },
  {
    icon: Network,
    responsibilities: [
      "LAN / WAN setup, router & switch configuration",
      "CCTV camera, DVR/NVR installation & configuration",
      "Fiber optic and structured network cabling",
      "IP addressing and on-site network troubleshooting",
    ],
    requirements: [
      "Diploma / Degree in IT, ECE or networking certification (or equivalent experience)",
      "Freshers and experienced candidates both welcome",
      "Comfortable with on-site installation work",
    ],
    job: {
      slug: "networking-engineer",
      title: "Networking Engineer",
      employmentType: "FULL_TIME",
      datePosted: DATE_POSTED,
      validThrough: VALID_THROUGH,
      applicantAreas: APPLICANT_AREAS,
      description:
        "Zorba Infotech is hiring a Networking Engineer in Neemuch. Responsibilities include LAN/WAN " +
        "setup, router and switch configuration, CCTV & DVR/NVR installation, fiber optic and structured " +
        "cabling, IP addressing and on-site network troubleshooting for homes, schools and businesses. " +
        "A diploma/degree in IT/ECE or networking certification is preferred, but relevant hands-on " +
        "experience is equally valued. Freshers and experienced candidates are both welcome. Salary is " +
        "as per experience and skills. Work location: Neemuch, Madhya Pradesh. Candidates from Neemuch, " +
        "across Madhya Pradesh and Rajasthan may apply. " +
        applyText,
    },
  },
  {
    icon: Headset,
    responsibilities: [
      "On-site and workshop computer service & repair",
      "AMC support for schools, offices & institutions",
      "OS, driver and software installation & configuration",
      "Peripheral, biometric & printer setup and support",
    ],
    requirements: [
      "ITI / Diploma or practical computer service experience",
      "Freshers and experienced candidates both welcome",
      "Good communication and customer-handling skills",
    ],
    job: {
      slug: "computer-service-engineer",
      title: "Computer Service Engineer",
      employmentType: "FULL_TIME",
      datePosted: DATE_POSTED,
      validThrough: VALID_THROUGH,
      applicantAreas: APPLICANT_AREAS,
      description:
        "Zorba Infotech is hiring a Computer Service Engineer in Neemuch. The role covers on-site and " +
        "workshop repair of computers and peripherals, AMC support for schools, offices and institutions, " +
        "OS/driver/software installation, and biometric & printer setup. ITI/Diploma or practical service " +
        "experience preferred. Freshers and experienced candidates are both welcome. Salary is as per " +
        "experience and skills. Work location: Neemuch, Madhya Pradesh. Candidates from Neemuch, across " +
        "Madhya Pradesh and Rajasthan may apply. " +
        applyText,
    },
  },
];

const faqs = [
  {
    question: "Is Zorba Infotech a placement agency or the direct employer?",
    answer:
      "Zorba Infotech is the direct employer. These are direct company payroll jobs at our showroom and service center in Neemuch — not third-party placements.",
  },
  {
    question: "Can freshers apply for these computer jobs in Neemuch?",
    answer:
      "Yes! Freshers with ITI / Diploma / Degree or practical hands-on computer knowledge are encouraged to apply. We provide comprehensive on-the-job training.",
  },
  {
    question: "What is the work location and are candidates outside Neemuch eligible?",
    answer:
      "Work location is Neemuch, Madhya Pradesh (Shop No. 5 & 6, U-Shape Market, Tagore Marg). Candidates from Neemuch, Mandsaur, Ratlam, Chittorgarh, across MP and Rajasthan are welcome.",
  },
  {
    question: "How do I apply for a job at Zorba Infotech?",
    answer:
      "You can apply directly online through this page, call or WhatsApp our HR numbers (+91 99935 99730, +91 93021 99730), or walk in directly to our showroom with your resume.",
  },
];

export default function Careers() {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRoleTitle, setSelectedRoleTitle] = useState("Computer Hardware Technician");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [experience, setExperience] = useState("Fresher");
  const [resumeLink, setResumeLink] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openApplyForRole = (title: string) => {
    setSelectedRoleTitle(title);
    setShowApplyModal(true);
  };

  const handleOnlineApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!isValidIndianPhoneNumber(phone)) {
      toast.error("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const normalizedPhone = formatIndianPhoneNumber(phone);

      await createJobApplication({
        fullName: fullName.trim(),
        phone: normalizedPhone,
        email: email.trim() || undefined,
        positionApplied: selectedRoleTitle,
        experience: experience.trim(),
        resumeLink: resumeLink.trim() || undefined,
        message: message.trim() || undefined,
      });

      toast.success("Application submitted successfully! Our HR team will contact you shortly.");
      setShowApplyModal(false);
      setFullName("");
      setPhone("");
      setEmail("");
      setResumeLink("");
      setMessage("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to submit application. Please call or WhatsApp us.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Careers & Job Openings in Neemuch – Zorba Infotech | Hardware & Network Engineer Jobs"
        description="Direct computer hardware jobs in Neemuch at Zorba Infotech. Openings for Hardware Technicians, Network Engineers & Service Engineers. Freshers & experienced welcome. Apply now!"
        path="/careers"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Careers", url: "/careers" },
        ]}
      />
      {roles.map((r) => (
        <JobPostingSchema key={r.job.slug} job={r.job} />
      ))}
      <FAQSchema items={faqs} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 py-16 md:py-20 text-white shadow-inner">
        <div className="container mx-auto max-w-3xl text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300 tracking-wide uppercase shadow-xs">
            <Briefcase className="h-3.5 w-3.5" />
            Direct Company Hiring (No Agency)
          </span>
          <h1 className="text-3xl font-extrabold font-display sm:text-4xl md:text-5xl text-white tracking-tight leading-tight">
            Careers at Zorba Infotech
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Join Neemuch's premier IT hardware distributor and service center. We offer full-time positions with hands-on technical training for freshers and competitive compensation for experienced engineers.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 px-3 py-1 text-slate-200">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" /> Neemuch Showroom &amp; Service Hub
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 px-3 py-1 text-slate-200">
              <Clock className="h-3.5 w-3.5 text-emerald-400" /> Full-Time Roles
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 px-3 py-1 text-slate-200">
              <GraduationCap className="h-3.5 w-3.5 text-amber-400" /> Freshers &amp; Trainees Welcome
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container py-14 md:py-18">
        <div className="mx-auto max-w-4xl space-y-12">
          {/* Quick Direct Apply Action Card */}
          <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fast 1-Step Application
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Ready to Build Your IT Career?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Submit your application online in under 30 seconds or connect directly with our hiring managers.
                </p>
              </div>

              <Button
                onClick={() => openApplyForRole("General Technical Position")}
                className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 h-11 px-6 text-xs sm:text-sm shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                Apply Online Now
              </Button>
            </div>

            {/* Direct HR Helpline Strip */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                HR Desks &amp; WhatsApp Inquiries
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {contactNumbers.map((c) => (
                  <div
                    key={c.number}
                    className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 p-2.5"
                  >
                    <div className="min-w-0">
                      <span className="block text-[10px] font-semibold text-muted-foreground truncate">
                        {c.label}
                      </span>
                      <span className="font-semibold font-mono text-xs text-foreground">
                        +91 {c.number.replace(/(\d{5})(\d{5})/, "$1 $2")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://wa.me/91${c.number}?text=${encodeURIComponent(
                          "Hi Zorba Infotech, I want to apply for a job opening."
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="whatsapp"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          aria-label={`WhatsApp ${c.label}`}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Open Roles */}
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Open Opportunities
              </span>
              <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
                Current Job Openings
              </h2>
            </div>

            <div className="space-y-6">
              {roles.map((role) => (
                <article
                  key={role.job.slug}
                  id={role.job.slug}
                  className="scroll-mt-24 rounded-2xl border bg-card p-6 sm:p-8 card-hover transition-all space-y-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <role.icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-display text-xl font-bold text-foreground">
                        {role.job.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Full-Time · Neemuch Showroom &amp; Service Hub · Freshers &amp; Experienced · Salary as per skills
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 pt-2">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Key Responsibilities
                      </h4>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        {role.responsibilities.map((r) => (
                          <li key={r} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="leading-relaxed">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Candidate Profile
                      </h4>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        {role.requirements.map((r) => (
                          <li key={r} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span className="leading-relaxed">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                    <Button
                      onClick={() => openApplyForRole(role.job.title)}
                      className="gap-2 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-9 px-4 text-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Apply for this Role
                    </Button>

                    <a
                      href={`https://wa.me/919993599730?text=${encodeURIComponent(
                        `Hi Zorba Infotech, I want to apply for the ${role.job.title} position.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="whatsapp" size="sm" className="h-9 text-xs rounded-xl gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp HR
                      </Button>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Frequently Asked Questions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {faqs.map((f) => (
                <div key={f.question} className="rounded-2xl border bg-card p-6 space-y-2">
                  <h3 className="font-semibold text-sm text-foreground">{f.question}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Online Application Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="sm:max-w-lg p-6 rounded-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-foreground">
              <Briefcase className="h-5 w-5 text-primary" />
              <span>Apply for {selectedRoleTitle}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleOnlineApplicationSubmit} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="app-name" className="text-xs font-semibold">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="app-name"
                  required
                  placeholder="e.g. FirstName LastName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="app-phone" className="text-xs font-semibold">
                  Mobile / WhatsApp <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="app-phone"
                  required
                  type="tel"
                  placeholder="e.g. 99935 99730"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="app-email" className="text-xs font-semibold">Email Address (Optional)</Label>
                <Input
                  id="app-email"
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="app-exp" className="text-xs font-semibold">Experience Level</Label>
                <select
                  id="app-exp"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full h-10 rounded-xl border bg-background px-3 text-xs"
                >
                  <option value="Fresher">Fresher (Ready to Learn)</option>
                  <option value="1-2 Years">1 - 2 Years</option>
                  <option value="3-5 Years">3 - 5 Years</option>
                  <option value="5+ Years">5+ Years Experience</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-resume" className="text-xs font-semibold">
                Resume / Portfolio Link (Google Drive / LinkedIn / PDF)
              </Label>
              <Input
                id="app-resume"
                type="url"
                placeholder="https://drive.google.com/..."
                value={resumeLink}
                onChange={(e) => setResumeLink(e.target.value)}
                className="h-10 text-xs rounded-xl font-mono"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                If sharing a Google Drive link, please set link access to <em>&ldquo;Anyone with the link can view&rdquo;</em>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-message" className="text-xs font-semibold">Brief Introduction / Relevant Skills</Label>
              <Textarea
                id="app-message"
                rows={3}
                placeholder="Tell us about your background, ITI diploma, hardware repair experience or why you want to join Zorba..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowApplyModal(false)}
                className="h-10 text-xs rounded-xl px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 rounded-xl gap-1.5 px-5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Application</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
