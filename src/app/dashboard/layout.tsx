import { ThemeProvider } from "./ThemeProvider";
import { ModeProvider } from "./ModeContext";
import ClientLayout from "./ClientLayout";
import { QueryProvider } from "./QueryProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ModeProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ModeProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
