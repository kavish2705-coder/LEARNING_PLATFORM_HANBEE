import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "./RoleContext";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  title: {
    default: "Hanbee: Trusted Coding & Robotics Program for School Students | Learn · Build · Belong",
    template: "%s | Hanbee Student Engineering Program",
  },
  description:
    "India's trusted, mentor-led coding and robotics program for school students. Students learn real Java and embedded programming, build a working engineering project by hand, and grow through a structured, supervised six-month season, built for parents' peace of mind.",
  keywords: [
    "Hanbee",
    "Hanbee Student Engineering Program",
    "Coding Program for School Students",
    "Robotics Program for Students",
    "Inter-School Robotics Competition",
    "STEM Education India",
    "High School Engineering Program",
    "Embedded Systems Programming for Students",
    "Hands-on STEM Curriculum",
    "Java Programming for School Students",
    "Student Engineering Championship",
    "Mentor-Led STEM Program",
    "Safe Learning Environment for Students",
    "Parent-Trusted Education Program",
  ],
  authors: [{ name: "Hanbee", url: "https://hanbee.in" }],
  creator: "Hanbee",
  publisher: "Hanbee",
  applicationName: "Hanbee Student Engineering Program",
  alternates: {
    canonical: "https://hanbee.in",
  },
  openGraph: {
    title: "Hanbee: Trusted Coding & Robotics Program for School Students",
    description:
      "Don't just study. Build something real. Learn to code, build it with your own hands, and grow with a mentor-guided team your family can trust.",
    url: "https://hanbee.in",
    siteName: "Hanbee",
    images: [{ url: "/hero-bg.jpg", width: 1200, height: 630, alt: "Hanbee Student Engineering Program" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hanbee: Trusted Coding & Robotics Program for School Students",
    description:
      "India's trusted coding and robotics program for school students. Learn · Build · Belong.",
    images: ["/hero-bg.jpg"],
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
  category: "Education & STEM",
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
        "A mentor-led coding and robotics program for school students, helping them build real engineering projects, learn genuine programming skills, and grow through a structured, supervised season.",
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
      "@type": "EducationalOccupationalProgram",
      "@id": "https://hanbee.in/#program",
      name: "Hanbee Student Engineering Program",
      description:
        "A structured, six-month coding and robotics program where school students learn real programming and engineering skills under mentor supervision.",
      url: "https://hanbee.in",
      provider: {
        "@id": "https://hanbee.in/#organization",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://hanbee.in/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does the Hanbee season program work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The Hanbee program runs as a six-month, mentor-guided season. Students build skills and reach milestones every month, with structured, supervised events that track real progress throughout the program.",
          },
        },
        {
          "@type": "Question",
          name: "Who can join the Hanbee program?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The program is open to school student teams registered through their institution, as well as individual students who join independently with parent or guardian consent.",
          },
        },
        {
          "@type": "Question",
          name: "What do students actually learn and build?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Every student learns real Java and robotics programming and builds a working engineering project by hand, guided by mentors through a structured curriculum designed for school students.",
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
          href="https://fonts.googleapis.com/css2?family=Afacad:ital,wght@0,400..700;1,400..700&family=Rajdhani:wght@500;600;700&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
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
