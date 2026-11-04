import { ThemeProvider } from "./ThemeProvider";
import { ModeProvider } from "./ModeContext";
import ClientLayout from "./ClientLayout";
import { QueryProvider } from "./QueryProvider";
import AuthGate from "./components/AuthGate";
import InitialPlanGate from "./components/InitialPlanGate";
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
            <InitialPlanGate>
              <ToastProvider>
                <ClientLayout>
                  {children}
                </ClientLayout>
              </ToastProvider>
            </InitialPlanGate>
          </AuthGate>
        </ModeProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
