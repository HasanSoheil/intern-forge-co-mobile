import { useLocalSearchParams } from "expo-router";
import { InternshipDetail } from "@/features/internships/InternshipDetail";

export default function InternshipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InternshipDetail id={String(id)} />;
}
