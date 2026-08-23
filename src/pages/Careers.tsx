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
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { createJobApplication } from "@/lib/firestore";
import { toast } from "sonner";

const DATE_POSTED = "2026-07-23";
const VALID_THROUGH = "2026-10-31";
const APPLICANT_AREAS = ["Neemuch", "Madhya Pradesh", "Rajasthan"];

const contactNumbers = [
  { label: "Zorba Swami", number: "9993599730" },
  { label: "HR / Support", number: "9302199730" },
  { label: "Sales", number: "9424899730" },
  { label: "Accounts", number: "9179699730" },
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
      "Assemble custom desktop PCs and workstations",
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
      "Zorba Infotech is the direct employer. These are jobs at our own company in Neemuch — not third-party placements. You are hired by and work directly with Zorba Infotech.",
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
      "You can apply directly online through this page, call or WhatsApp our HR numbers (+91 99935 99730, +91 93021 99730), or visit our showroom with your resume.",
  },
];

const Careers = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  // Online Application Modal State
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
      toast.error("Full name is required");
      return;
    }
    const cleanDigits = phone.replace(/\D/g, "");
    if (!phone.trim() || cleanDigits.length < 10) {
      toast.error("Please enter a valid 10-digit mobile phone number");
      return;
    }

    setSubmitting(true);
    try {
      await createJobApplication({
        fullName: fullName.trim(),
        phone: phone.trim(),
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
        title="Careers & Computer Jobs in Neemuch – Zorba Infotech | Hardware & Network Engineer Vacancies"
        description="Direct computer hardware jobs in Neemuch at Zorba Infotech. Openings for Hardware Technicians, Network Engineers & Service Engineers. Freshers & experienced welcome. Apply now!"
        path="/careers"
      />
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Careers", url: "/careers" }]} />
      {roles.map((r) => (
        <JobPostingSchema key={r.job.slug} job={r.job} />
      ))}
      <FAQSchema items={faqs} />

      <div className="container py-12">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div
            ref={headerRef}
            className={`transition-all duration-700 ${
              headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <Briefcase className="h-3.5 w-3.5" /> We Are Hiring Direct Positions
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
              Careers &amp; Job Openings in Neemuch, MP &amp; Rajasthan
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              <strong>Zorba Infotech</strong> — Neemuch's leading computer hardware dealer, IT
              distributor &amp; authorized service center — is hiring. These are{" "}
              <strong>direct jobs at our own company</strong> (we are the direct employer). We urgently need skilled and trainee candidates for computer
              hardware, networking and service roles. <strong>Freshers and experienced</strong>{" "}
              candidates from Neemuch, across <strong>Madhya Pradesh</strong> and{" "}
              <strong>Rajasthan</strong> are welcome to apply.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-muted-foreground text-xs">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Neemuch, Madhya Pradesh
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-muted-foreground text-xs">
                Full-time
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-muted-foreground text-xs">
                Salary: as per experience &amp; skills
              </span>
            </div>
          </div>

          {/* Quick Apply Action Box */}
          <div className="mt-6 rounded-2xl border bg-gradient-to-r from-blue-900/10 via-card to-card p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold">Apply Online Directly</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submit your details in 30 seconds or reach out directly to our HR desk.
                </p>
              </div>
              <Button
                onClick={() => openApplyForRole("General Application / Any Role")}
                className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold gap-2 text-xs h-10 px-5 rounded-xl cursor-pointer shrink-0 shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                <span>Apply Online Now</span>
              </Button>
            </div>

            <div className="mt-5 pt-4 border-t grid gap-2.5 sm:grid-cols-2">
              {contactNumbers.map((c) => (
                <div key={c.number} className="flex items-center gap-2 rounded-xl border bg-card p-2.5">
                  <span className="flex-1 text-xs">
                    <span className="block text-[11px] text-muted-foreground">{c.label}</span>
                    <span className="font-semibold font-mono">
                      +91 {c.number.replace(/(\d{5})(\d{5})/, "$1 $2")}
                    </span>
                  </span>
                  <a href={`tel:+91${c.number}`}>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" aria-label={`Call ${c.label}`}>
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/91${c.number}?text=${encodeURIComponent(
                      "Hi Zorba Infotech, I want to apply for a job opening."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="whatsapp" size="icon" className="h-8 w-8 rounded-lg" aria-label={`WhatsApp ${c.label}`}>
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Roles List */}
          <div className="mt-10 space-y-6">
            {roles.map((role) => (
              <article
                key={role.job.slug}
                id={role.job.slug}
                className="scroll-mt-24 rounded-2xl border bg-card p-6 shadow-xs"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <role.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-xl font-bold">{role.job.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Full-time · Neemuch, MP · Freshers &amp; experienced · Salary as per experience
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Responsibilities</h3>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {role.responsibilities.map((r) => (
                        <li key={r} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Who Can Apply</h3>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {role.requirements.map((r) => (
                        <li key={r} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zorba-green" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5 pt-4 border-t">
                  <Button
                    onClick={() => openApplyForRole(role.job.title)}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Apply Online</span>
                  </Button>
                  <a href="tel:+919993599730">
                    <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Call HR
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/919993599730?text=${encodeURIComponent(
                      `Hi Zorba Infotech, I want to apply for the ${role.job.title} position.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="whatsapp" size="sm" className="h-9 text-xs rounded-xl gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp HR
                    </Button>
                  </a>
                </div>
              </article>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <h2 className="font-display text-2xl font-bold">Frequently Asked Questions</h2>
            <div className="mt-5 space-y-4">
              {faqs.map((f) => (
                <div key={f.question} className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold text-sm">{f.question}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Online Application Dialog */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base text-slate-900 dark:text-white">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <span>Apply for {selectedRoleTitle}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleOnlineApplicationSubmit} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  required
                  placeholder="e.g. Anand Patidar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone / WhatsApp Number <span className="text-red-500">*</span></Label>
                <Input
                  required
                  type="tel"
                  placeholder="e.g. 98261 22334"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address (Optional)</Label>
                <Input
                  type="email"
                  placeholder="e.g. anand@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Experience Level</Label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs"
                >
                  <option value="Fresher">Fresher (Ready to Learn)</option>
                  <option value="1-2 Years">1 - 2 Years</option>
                  <option value="3-5 Years">3 - 5 Years</option>
                  <option value="5+ Years">5+ Years Experience</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Resume / Bio Link (Google Drive / LinkedIn / PDF Link)</Label>
              <Input
                type="url"
                placeholder="https://drive.google.com/..."
                value={resumeLink}
                onChange={(e) => setResumeLink(e.target.value)}
                className="h-9 text-xs rounded-xl font-mono"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                If sharing a Google Drive or cloud document, please ensure access permissions are granted to <span className="font-semibold text-foreground">zorbainfotech@gmail.com</span> and <span className="font-semibold text-foreground">zorbasquad@gmail.com</span> (or set link access to <em>&ldquo;Anyone with the link can view&rdquo;</em>).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Brief Introduction / Relevant Skills</Label>
              <Textarea
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
                className="h-9 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? "Submitting Application..." : "Submit Application"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Careers;
