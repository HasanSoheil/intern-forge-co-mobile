import { useAuth } from "@/context/auth-context";
import { MoreMenu } from "@/features/more/MoreMenu";
import { Settings } from "@/features/settings/Settings";

export default function MoreTab() {
  const { role } = useAuth();
  // Admins have no profile/notifications — their last tab is Settings itself.
  if (role === "admin") return <Settings back={false} />;
  return <MoreMenu />;
}
