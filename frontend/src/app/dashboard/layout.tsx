import { ThemeProvider } from "./ThemeProvider";
import { ModeProvider } from "./ModeContext";
import ClientLayout from "./ClientLayout";
import { QueryProvider } from "./QueryProvider";
import AuthGate from "./components/AuthGate";
import { ToastProvider } from "../../components/ui/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ModeProvider>
          <AuthGate>
            <ToastProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </ToastProvider>
          </AuthGate>
        </ModeProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
