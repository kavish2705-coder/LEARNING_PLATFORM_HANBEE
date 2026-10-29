import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "./RoleContext";

export const metadata: Metadata = {
  title: "Hanbee — Learn Beyond the Obvious",
  description:
    "A learning space for curious minds — built to help you gain real skills, achieve your goals, and create a life you're proud of.",
  keywords: ["learning", "LMS", "education", "courses", "Hanbee", "online learning"],
  openGraph: {
    title: "Hanbee — Learn Beyond the Obvious",
    description:
      "A learning space for curious minds — built to help you gain real skills, achieve your goals, and create a life you're proud of.",
    type: "website",
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
