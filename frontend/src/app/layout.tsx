import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "./RoleContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://hanbee.in"),
  title: {
    default: "Hanbee — Inter-School Autonomous & RC Racing League | Learn · Build · Belong",
    template: "%s | Hanbee RC League",
  },
  description:
    "India's premier inter-school autonomous robotics & RC racing championship. High school students engineer competition-grade RC vehicles, code custom firmware, and compete in a 6-month zero-elimination league.",
  keywords: [
    "Hanbee",
    "Hanbee RC Tournament",
    "RC Racing League",
    "Autonomous RC Car Racing",
    "Inter-School Robotics Competition",
    "STEM Education India",
    "High School Engineering League",
    "Flight Controller Programming",
    "Zero Elimination Championship",
    "Formula RC Racing",
    "Student Motorsport League",
    "Hands-on STEM Curriculum",
    "Embedded Systems for High School",
    "Brushless Motor RC Telemetry",
  ],
  authors: [{ name: "Hanbee", url: "https://hanbee.in" }],
  creator: "Hanbee",
  publisher: "Hanbee",
  applicationName: "Hanbee Racing Platform",
  alternates: {
    canonical: "https://hanbee.in",
  },
  openGraph: {
    title: "Hanbee — Inter-School Autonomous & RC Racing League",
    description:
      "Don't Just Study. Build Something Real. Build the car with your own hands. Code the brain with your team. Race wheel-to-wheel for six months.",
    url: "https://hanbee.in",
    siteName: "Hanbee",
    images: [
      {
        url: "/brand/hanbee-logo-white.png",
        width: 1200,
        height: 630,
        alt: "Hanbee Autonomous & RC Racing League",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hanbee — Inter-School Autonomous & RC Racing League",
    description:
      "India's premier inter-school autonomous and RC racing league. Learn · Build · Belong.",
    images: ["/brand/hanbee-logo-white.png"],
    creator: "@hanbee_in",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Education & Robotics",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://hanbee.in/#organization",
      name: "Hanbee",
      url: "https://hanbee.in",
      logo: "https://hanbee.in/brand/hanbee-logo.png",
      description:
        "Inter-school autonomous & RC racing league empowering students to build real competition-grade vehicles, code custom firmware, and race under a zero-elimination championship format.",
      sameAs: [
        "https://www.linkedin.com/company/hanbee-india/posts/",
        "https://www.instagram.com/hanbee.in?igsh=b2thYzA4Mm05enNk",
      ],
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
      },
    },
    {
      "@type": "SportsLeague",
      "@id": "https://hanbee.in/#league",
      name: "Hanbee Autonomous & RC Racing League",
      sport: "Motorsport / Autonomous RC Racing",
      url: "https://hanbee.in",
      organizer: {
        "@id": "https://hanbee.in/#organization",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://hanbee.in/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does the Hanbee season competition work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The Hanbee league is a six-month cumulative points championship where teams compete in Speed Races, Time Trials, Obstacle Challenges, Endurance Races, Knockout Challenges, and the Grand Championship.",
          },
        },
        {
          "@type": "Question",
          name: "Who can participate in the Hanbee Racing League?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The league is open to high school student squads representing their institutions as well as solo independent racers with faculty or guardian authorization.",
          },
        },
        {
          "@type": "Question",
          name: "What hardware and curriculum are included?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Every team receives a competition-grade RC chassis kit, brushless powertrain, electronic speed controllers (ESC), optical lap transponders, and custom flight controller firmware curriculum.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Afacad:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <RoleProvider>
          {children}
        </RoleProvider>
      </body>
    </html>
  );
}
