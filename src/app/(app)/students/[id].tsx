import { useLocalSearchParams } from "expo-router";
import { StudentProfileView } from "@/features/profile/StudentProfileView";

export default function StudentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StudentProfileView id={String(id)} />;
}
