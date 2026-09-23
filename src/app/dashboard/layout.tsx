import Sidebar from "@/components/Sidebar/Sidebar";
import DashboardNav from "@/components/DashboardNav/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#050505" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <DashboardNav />
        <main style={{ flex: 1, padding: "24px 48px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
