"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionProfile } from "../../lib/hooks/useSessionProfile";
import TournamentOverview from "./components/TournamentOverview";
import SchoolOverview from "./components/school/SchoolOverview";
import HanbeeOverview from "./components/hanbee/HanbeeOverview";
import ManagerDashboard from "./components/manager/ManagerDashboard";

export default function DashboardOverview() {
  const router = useRouter();
  const { data: profile } = useSessionProfile();

  const role = profile?.role;

  useEffect(() => {
    if (role === "school_staff") {
      router.replace("/dashboard/school/overview");
    } else if (role === "staff") {
      router.replace("/dashboard/hanbee/my-space");
    } else if (role === "manager") {
      router.replace("/dashboard/manager/monitor");
    }
  }, [role, router]);

  if (role === "school_staff") {
    return <SchoolOverview />;
  }

  if (role === "staff") {
    return <HanbeeOverview />;
  }

  if (role === "manager") {
    return <ManagerDashboard />;
  }

  // Learning is hidden until it's ready (see Sidebar.tsx) -- a student
  // always gets the tournament overview here, regardless of any stale
  // "learning" value left in localStorage from before the mode switcher
  // was removed.
  return (
    <div>
      <TournamentOverview />
    </div>
  );
}

