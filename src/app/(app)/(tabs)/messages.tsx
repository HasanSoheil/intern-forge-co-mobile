import { useAuth } from "@/context/auth-context";
import { MessagesList } from "@/features/messages/MessagesList";
import { AdminScreen } from "@/features/admin/AdminScreen";
import { Loading, Screen } from "@/components/ui";

export default function MessagesTab() {
  const { role } = useAuth();
  // Admins don't message anyone — this slot hosts Plans instead.
  if (role === "admin") return <AdminScreen section="plans" />;
  if (role === "student" || role === "company") return <MessagesList />;
  return <Screen scroll={false}><Loading /></Screen>;
}
