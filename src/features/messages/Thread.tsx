import { useEffect, useRef, useState } from "react";
import { View, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react-native";
import { Header, Text, Loading } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { parseThreadId, clockTime } from "@/lib/utils";

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  internship_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function Thread({ threadId }: { threadId: string }) {
  const { internshipId, otherUserId } = parseThreadId(threadId);
  const { colors, spacing, radius } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const { data: otherName } = useQuery({
    queryKey: ["thread-other", otherUserId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name,email").eq("id", otherUserId).maybeSingle();
      return data?.full_name ?? data?.email ?? "Conversation";
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: async () =>
      ((await supabase
        .from("messages")
        .select("*")
        .eq("internship_id", internshipId)
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user!.id})`)
        .order("created_at", { ascending: true })).data ?? []) as MessageRow[],
    enabled: !!user,
  });

  // Realtime — fires on INSERT for either direction in this thread.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `internship_id=eq.${internshipId}` },
        (payload) => {
          const m = payload.new as { sender_id: string; recipient_id: string };
          const mine = m.sender_id === user.id && m.recipient_id === otherUserId;
          const theirs = m.sender_id === otherUserId && m.recipient_id === user.id;
          if (mine || theirs) qc.invalidateQueries({ queryKey: ["thread", threadId] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, threadId, internshipId, otherUserId, qc]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (messages?.length) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages]);

  // Mark received unread messages as read.
  useEffect(() => {
    if (!user || !messages?.length) return;
    const unread = messages.filter((m) => m.recipient_id === user.id && !m.read).map((m) => m.id);
    if (unread.length) {
      supabase.from("messages").update({ read: true }).in("id", unread).then(() => {
        qc.invalidateQueries({ queryKey: ["unread-messages-map"] });
      });
    }
  }, [messages, user, qc]);

  const send = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user!.id, recipient_id: otherUserId, internship_id: internshipId, content,
      });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["thread", threadId] }); },
  });

  const submit = () => {
    const c = text.trim();
    if (c) send.mutate(c);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Header title={otherName ?? "Conversation"} back />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {isLoading ? (
            <Loading />
          ) : !messages?.length ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl }}>
              <Text variant="muted" center>Say hi 👋</Text>
            </View>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user!.id;
              return (
                <View key={m.id} style={{ flexDirection: "row", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <View
                    style={{
                      maxWidth: "78%",
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: radius.lg,
                      borderTopRightRadius: mine ? 4 : radius.lg,
                      borderTopLeftRadius: mine ? radius.lg : 4,
                      backgroundColor: mine ? colors.primary : colors.surface,
                      borderWidth: mine ? 0 : 1,
                      borderColor: colors.cardBorder,
                    }}
                  >
                    <Text style={{ color: mine ? colors.onPrimary : colors.text, fontSize: 15 }}>{m.content}</Text>
                    <Text style={{ fontSize: 10, marginTop: 3, color: mine ? colors.onPrimary : colors.textFaint, opacity: 0.75 }}>
                      {clockTime(m.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(spacing.lg, insets.bottom),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={colors.textFaint}
            onSubmitEditing={submit}
            returnKeyType="send"
            style={{
              flex: 1,
              minHeight: 46,
              maxHeight: 120,
              color: colors.text,
              fontSize: 15,
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: 12,
            }}
            multiline
          />
          <Pressable
            onPress={submit}
            disabled={!text.trim() || send.isPending}
            style={{
              width: 46,
              height: 46,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: !text.trim() || send.isPending ? 0.5 : 1,
            }}
          >
            <Send size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
