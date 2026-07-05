import { useAuth } from "@/context/auth-context";
import { AdminScreen } from "@/features/admin/AdminScreen";
import { EmptyState, Screen } from "@/components/ui";

// Admin-only tab slot (hidden from the tab bar for other roles).
export default function AdminTab() {
  const { role } = useAuth();
  if (role === "admin") return <AdminScreen section="challenges" />;
  return <Screen><EmptyState title="Not available" description="This tab is for admins." /></Screen>;
}
