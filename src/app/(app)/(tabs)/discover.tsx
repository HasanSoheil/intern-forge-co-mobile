import { useAuth } from "@/context/auth-context";
import { StudentChallenges } from "@/features/challenges/StudentChallenges";
import { CompanyMatched } from "@/features/matched/CompanyMatched";
import { AdminScreen } from "@/features/admin/AdminScreen";
import { Loading, Screen } from "@/components/ui";

export default function DiscoverTab() {
  const { role } = useAuth();
  if (role === "student") return <StudentChallenges />;
  if (role === "company") return <CompanyMatched />;
  if (role === "admin") return <AdminScreen section="fields" />;
  return <Screen scroll={false}><Loading /></Screen>;
}
