import { useLocalSearchParams } from "expo-router";
import { Thread } from "@/features/messages/Thread";

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  return <Thread threadId={String(threadId)} />;
}
