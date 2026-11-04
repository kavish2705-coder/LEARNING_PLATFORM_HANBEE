import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "./RoleContext";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Hanbee — Learn Beyond the Obvious",
  description:
    "Write the code. Build the car. Race it for real — Hanbee blends Java, DSA, and React with hands-on RC racing, for students and schools.",
  keywords: ["learning", "LMS", "education", "courses", "Hanbee", "online learning", "RC racing", "Java", "DSA"],
  openGraph: {
    title: "Hanbee — Learn Beyond the Obvious",
    description:
      "Write the code. Build the car. Race it for real — Hanbee blends Java, DSA, and React with hands-on RC racing, for students and schools.",
    type: "website",
    images: [{ url: "/hero-bg.jpg", width: 1200, height: 630, alt: "Hanbee RC racing cars" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hanbee — Learn Beyond the Obvious",
    description:
      "Write the code. Build the car. Race it for real — Hanbee blends Java, DSA, and React with hands-on RC racing, for students and schools.",
    images: ["/hero-bg.jpg"],
  },
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
      </head>
      <body>
        <RoleProvider>
          {children}
        </RoleProvider>
      </body>
    </html>
  );
}
