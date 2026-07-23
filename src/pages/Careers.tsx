import Layout from "@/components/layout/Layout";
import {
  SEO,
  BreadcrumbSchema,
  JobPostingSchema,
  FAQSchema,
  type JobPostingData,
} from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MessageCircle,
  MapPin,
  Briefcase,
  Wrench,
  Network,
  Headset,
  CheckCircle2,
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// Roles we are hiring for. Zorba Infotech is the direct employer (placement is
// at our own company, not a third-party agency). Work location is Neemuch;
// candidates from across Madhya Pradesh & Rajasthan are welcome.
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
      "Yes. Both freshers and experienced candidates are welcome for all roles. We provide on-the-job training for the right candidates.",
  },
  {
    question: "I am from another town in Madhya Pradesh or Rajasthan — can I apply?",
    answer:
      "Yes. The work location is Neemuch (Madhya Pradesh, near the Rajasthan border), and candidates from across Madhya Pradesh and Rajasthan are welcome to apply.",
  },
  {
    question: "What is the salary for these roles?",
    answer:
      "Salary is offered as per experience and skills. Call or WhatsApp us to discuss the details for your profile.",
  },
  {
    question: "How do I apply for a job at Zorba Infotech?",
    answer:
      "Call or WhatsApp us on +91 99935 99730, +91 93021 99730, +91 94248 99730 or +91 91796 99730, or walk in to Shop No. 5 & 6, U-Shape Market, Tagore Marg, Neemuch 458441, Madhya Pradesh.",
  },
];

const Careers = () => {
  const { ref, isVisible } = useScrollAnimation(0.05);

  return (
    <Layout>
      <SEO
        title="Jobs in Neemuch, MP & Rajasthan – Computer Technician, Networking & Service Engineer | Zorba Infotech Careers"
        description="Zorba Infotech is hiring in Neemuch (MP) & nearby Rajasthan: Computer Hardware Technician, Networking Engineer & Computer Service Engineer. Freshers & experienced welcome. Direct company jobs — call/WhatsApp to apply."
        path="/careers"
      />
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Careers", url: "/careers" }]} />
      {roles.map((role) => (
        <JobPostingSchema key={role.job.slug} job={role.job} />
      ))}
      <FAQSchema items={faqs} />

      <div className="container py-12">
        <div
          ref={ref}
          className={`mx-auto max-w-4xl transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Briefcase className="h-4 w-4" />
            We're Hiring
          </div>
          <h1 className="mt-2 text-3xl font-bold font-display md:text-4xl">
            Careers &amp; Job Openings in Neemuch, MP &amp; Rajasthan
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            <strong>Zorba Infotech</strong> — Neemuch's leading computer hardware dealer, IT
            distributor &amp; authorized service center — is hiring. These are{" "}
            <strong>direct jobs at our own company</strong> (we are the employer, not a third-party
            placement agency). We urgently need skilled and trainee candidates for computer
            hardware, networking and service roles. <strong>Freshers and experienced</strong>{" "}
            candidates from Neemuch, across <strong>Madhya Pradesh</strong> and{" "}
            <strong>Rajasthan</strong> are welcome to apply.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Neemuch, Madhya Pradesh
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-muted-foreground">
              Full-time
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-muted-foreground">
              Salary: as per experience &amp; skills
            </span>
          </div>

          {/* Apply CTA */}
          <div className="mt-6 rounded-2xl border bg-card p-5">
            <h2 className="font-display text-lg font-bold">How to Apply</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Call or WhatsApp us on any number below, or walk in to our showroom.
            </p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {contactNumbers.map((c) => (
                <div key={c.number} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <span className="flex-1 text-sm">
                    <span className="block text-xs text-muted-foreground">{c.label}</span>
                    <span className="font-medium">
                      +91 {c.number.replace(/(\d{5})(\d{5})/, "$1 $2")}
                    </span>
                  </span>
                  <a href={`tel:+91${c.number}`}>
                    <Button variant="outline" size="icon" aria-label={`Call ${c.label}`}>
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/91${c.number}?text=${encodeURIComponent(
                      "Hi Zorba Infotech, I want to apply for a job opening."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="whatsapp" size="icon" aria-label={`WhatsApp ${c.label}`}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div className="mt-10 space-y-6">
            {roles.map((role) => (
              <article
                key={role.job.slug}
                id={role.job.slug}
                className="scroll-mt-24 rounded-2xl border bg-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <role.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-xl font-bold">{role.job.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      Full-time · Neemuch, MP · Freshers &amp; experienced · Salary as per experience
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold">Responsibilities</h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      {role.responsibilities.map((r) => (
                        <li key={r} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Who Can Apply</h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      {role.requirements.map((r) => (
                        <li key={r} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-zorba-green" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a href="tel:+919993599730">
                    <Button variant="default" className="gap-2">
                      <Phone className="h-4 w-4" /> Call to Apply
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/919993599730?text=${encodeURIComponent(
                      `Hi Zorba Infotech, I want to apply for the ${role.job.title} position.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="whatsapp" className="gap-2">
                      <MessageCircle className="h-4 w-4" /> WhatsApp to Apply
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
                  <h3 className="font-semibold">{f.question}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Careers;
