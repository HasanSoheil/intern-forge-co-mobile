import { useAuth } from "@/context/auth-context";
import { StudentInternships } from "@/features/internships/StudentInternships";
import { CompanyApplicants } from "@/features/applicants/CompanyApplicants";
import { AdminScreen } from "@/features/admin/AdminScreen";
import { Loading, Screen } from "@/components/ui";

export default function BrowseTab() {
  const { role } = useAuth();
  if (role === "student") return <StudentInternships />;
  if (role === "company") return <CompanyApplicants />;
  if (role === "admin") return <AdminScreen section="users" />;
  return <Screen scroll={false}><Loading /></Screen>;
}
