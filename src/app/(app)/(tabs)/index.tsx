import { useAuth } from "@/context/auth-context";
import { StudentHome } from "@/features/home/StudentHome";
import { CompanyDashboard } from "@/features/home/CompanyDashboard";
import { AdminScreen } from "@/features/admin/AdminScreen";
import { Loading, Screen } from "@/components/ui";

export default function IndexTab() {
  const { role } = useAuth();
  if (role === "company") return <CompanyDashboard />;
  if (role === "admin") return <AdminScreen section="overview" />;
  if (role === "student") return <StudentHome />;
  return <Screen scroll={false}><Loading /></Screen>;
}
