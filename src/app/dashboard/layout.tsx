import { ThemeProvider } from "./ThemeProvider";
import ClientLayout from "./ClientLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ClientLayout>
        {children}
      </ClientLayout>
    </ThemeProvider>
  );
}
