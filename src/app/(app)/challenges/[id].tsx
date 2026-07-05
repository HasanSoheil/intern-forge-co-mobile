import { useLocalSearchParams } from "expo-router";
import { ChallengeDetail } from "@/features/challenges/ChallengeDetail";

export default function ChallengeDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  return <ChallengeDetail id={String(id)} type={type === "internship" ? "internship" : "platform"} />;
}
