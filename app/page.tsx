import { cookies } from "next/headers";
import PerfDashboardClient from "./components/perf/PerfDashboardClient";
import { DashboardLayout, LAYOUT_COOKIE } from "@/lib/perfLayout";

export const dynamic = "force-dynamic";

export default async function Page() {
  const layouts = DashboardLayout.parse((await cookies()).get(LAYOUT_COOKIE)?.value);
  return <PerfDashboardClient cctvUrl={process.env.CCTV_STREAM_URL ?? ""} layouts={layouts} />;
}
