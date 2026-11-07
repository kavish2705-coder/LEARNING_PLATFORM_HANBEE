import { notFound } from "next/navigation";

// Any /dashboard/* path that doesn't match a real page lands here, which
// matches it into the dashboard layout (sidebar intact) before handing
// off to dashboard/not-found.tsx -- without this catch-all, Next can't
// match an unknown path into the dashboard segment at all, and falls
// back to the bare root not-found.tsx instead.
export default function DashboardCatchAll() {
  notFound();
}
