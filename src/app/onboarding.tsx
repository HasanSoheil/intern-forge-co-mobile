import { Screen, Loading } from "@/components/ui";
import { useAuth } from "@/context/auth-context";
import { StudentOnboarding } from "@/features/onboarding/StudentOnboarding";
import { CompanyOnboarding } from "@/features/onboarding/CompanyOnboarding";

export default function Onboarding() {
  const { role, loading } = useAuth();
  if (loading || !role) return <Screen scroll={false}><Loading /></Screen>;
  if (role === "company") return <CompanyOnboarding />;
  return <StudentOnboarding />;
}
