import { Helmet } from "react-helmet-async";

const SITE_URL = "https://zorbainfotech.in";
const LOGO_IMAGE = `${SITE_URL}/logo-512x512.png`;
const DEFAULT_IMAGE = LOGO_IMAGE;

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
}

export const SEO = ({
  title = "Zorba Infotech – Computer Hardware Dealer & IT Distributor, Neemuch",
  description = "Zorba Infotech – Neemuch's premier computer hardware dealer, wholesale IT distributor & service center. Laptops, desktops, PC components, CCTV, networking & custom builds.",
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
}: SEOProps) => {
  const canonical = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export const LocalBusinessSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: "Zorba Infotech",
    alternateName: ["Zorba Service Center", "Prem Sagar Sales Agency"],
    description:
      "Zorba Infotech is Neemuch's premier computer hardware dealer, wholesale IT distributor and authorized service center offering 4,000+ IT products including laptops, desktops, CCTV, networking equipment, biometrics, and custom PC builds.",
    url: SITE_URL,
    telephone: ["+91-9993599730", "+91-9302199730", "+91-9424899730", "+91-9179699730"],
    email: "zorbainfotech@gmail.com",
    founder: { "@type": "Person", name: "Swami Prem Sagar" },
    taxID: "23AATPM9267A1ZH",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Shop No. 5 & 6, U-Shape Market, Tagore Marg",
      addressLocality: "Neemuch",
      addressRegion: "Madhya Pradesh",
      postalCode: "458441",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 24.457943,
      longitude: 74.868065,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "10:30",
        closes: "22:00",
      },
    ],
    sameAs: [
      "https://www.facebook.com/zorbainfotech/",
      "https://www.instagram.com/ZORBAINFOTECH1/",
      "https://www.indiamart.com/zorbainfotech",
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Computer Hardware & IT Products",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Product", name: "Laptops & Desktops" } },
        { "@type": "Offer", itemOffered: { "@type": "Product", name: "CCTV & Security Systems" } },
        { "@type": "Offer", itemOffered: { "@type": "Product", name: "Networking Equipment" } },
        { "@type": "Offer", itemOffered: { "@type": "Product", name: "Biometric Devices" } },
        { "@type": "Offer", itemOffered: { "@type": "Product", name: "PC Components" } },
        { "@type": "Offer", itemOffered: { "@type": "Product", name: "Printers & Copiers" } },
      ],
    },
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, Bank Transfer, Cheque",
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Neemuch, Madhya Pradesh, India",
    },
    image: DEFAULT_IMAGE,
    logo: LOGO_IMAGE,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export const BreadcrumbSchema = ({
  items,
}: {
  items: { name: string; url: string }[];
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export interface JobPostingData {
  /** Stable slug used for the @id / anchor, e.g. "computer-hardware-technician" */
  slug: string;
  title: string;
  description: string;
  datePosted: string;
  validThrough: string;
  employmentType?: string;
  /** Cities/regions this role draws candidates from, shown in the schema description. */
  applicantAreas?: string[];
}

const JOB_HIRING_ORG = {
  "@type": "Organization",
  name: "Zorba Infotech",
  sameAs: SITE_URL,
  logo: LOGO_IMAGE,
};

const JOB_LOCATION = {
  "@type": "Place",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Shop No. 5 & 6, U-Shape Market, Tagore Marg",
    addressLocality: "Neemuch",
    addressRegion: "Madhya Pradesh",
    postalCode: "458441",
    addressCountry: "IN",
  },
};

/**
 * Emits Google-for-Jobs compatible JobPosting structured data.
 * Salary is intentionally omitted (advertised as "as per experience");
 * omitting baseSalary is valid and safer than publishing a guessed figure.
 */
export const JobPostingSchema = ({ job }: { job: JobPostingData }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${SITE_URL}/careers#${job.slug}`,
    title: job.title,
    description: job.description,
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: job.employmentType ?? "FULL_TIME",
    identifier: {
      "@type": "PropertyValue",
      name: "Zorba Infotech",
      value: job.slug,
    },
    hiringOrganization: JOB_HIRING_ORG,
    jobLocation: JOB_LOCATION,
    directApply: true,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export const FAQSchema = ({
  items,
}: {
  items: { question: string; answer: string }[];
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
