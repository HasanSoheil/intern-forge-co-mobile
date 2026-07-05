import { useState } from "react";
import { View, Pressable, Modal, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useVideoPlayer, VideoView } from "expo-video";
import * as WebBrowser from "expo-web-browser";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Image as ImageIcon, Plus, X, Trash2, Play, Link2, Rocket, Award, Sparkles, Film } from "lucide-react-native";
import { Text, Card, Button, Input, Avatar, useToast } from "@/components/ui";
import { useTheme } from "@/theme/theme";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

const BUCKET = "student-media";

/** Open a posted link in the in-app browser, adding https:// if missing. */
function openLink(url: string) {
  const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  WebBrowser.openBrowserAsync(u).catch(() => {});
}

/** Pinch-to-zoom + pan + double-tap image for the lightbox. */
function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    sx.value = 0;
    sy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      if (scale.value <= 1) reset();
      else savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        tx.value = sx.value + e.translationX;
        ty.value = sy.value + e.translationY;
      }
    })
    .onEnd(() => {
      sx.value = tx.value;
      sy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) reset();
      else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[{ width: "92%", height: "72%" }, style]}>
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" cachePolicy="memory-disk" transition={150} />
      </Animated.View>
    </GestureDetector>
  );
}
type PostKind = "update" | "project" | "achievement";

interface MediaAtt {
  id: string;
  url: string;
  media_type: "image" | "video";
  caption: string | null;
  signedUrl: string;
}
interface FeedPost {
  id: string;
  kind: PostKind;
  body: string | null;
  link_url: string | null;
  created_at: string;
  media: MediaAtt[];
}

const KIND_META: Record<PostKind, { label: string; icon: typeof Sparkles }> = {
  update: { label: "Update", icon: Sparkles },
  project: { label: "Project", icon: Rocket },
  achievement: { label: "Achievement", icon: Award },
};

async function signAll(rows: Omit<MediaAtt, "signedUrl">[]): Promise<MediaAtt[]> {
  if (!rows.length) return [];
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.url), 3600);
  return rows.map((r, i) => ({ ...r, signedUrl: data?.[i]?.signedUrl ?? "" }));
}

/** Fullscreen video player for the lightbox (hook must run while mounted). */
function VideoLightbox({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  return <VideoView player={player} style={{ width: "100%", height: "72%" }} nativeControls contentFit="contain" />;
}

export function StudentFeed({ studentId, editable, authorName }: { studentId: string; editable: boolean; authorName: string }) {
  const { colors, spacing, radius } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const [lightbox, setLightbox] = useState<MediaAtt | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["student-feed", studentId],
    queryFn: async (): Promise<FeedPost[]> => {
      const { data: rows, error } = await supabase
        .from("student_posts")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      const ids = (rows ?? []).map((p) => p.id);
      const byPost = new Map<string, MediaAtt[]>();
      if (ids.length) {
        const { data: media } = await supabase
          .from("student_media")
          .select("id,url,media_type,caption,post_id,created_at")
          .in("post_id", ids)
          .order("created_at", { ascending: true });
        const mrows = (media ?? []) as Array<{ id: string; url: string; media_type: string; caption: string | null; post_id: string }>;
        const signed = await signAll(mrows.map((r) => ({ id: r.id, url: r.url, media_type: r.media_type as "image" | "video", caption: r.caption })));
        mrows.forEach((r, i) => {
          const arr = byPost.get(r.post_id) ?? [];
          arr.push(signed[i]);
          byPost.set(r.post_id, arr);
        });
      }
      return (rows ?? []).map((p) => ({
        id: p.id,
        kind: (p.kind as PostKind) ?? "update",
        body: p.body,
        link_url: p.link_url,
        created_at: p.created_at,
        media: byPost.get(p.id) ?? [],
      }));
    },
  });

  const del = useMutation({
    mutationFn: async (post: FeedPost) => {
      if (post.media.length) await supabase.storage.from(BUCKET).remove(post.media.map((m) => m.url));
      const { error } = await supabase.from("student_posts").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["student-feed", studentId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <View style={{ gap: spacing.md }}>
      {editable ? <Composer studentId={studentId} onPosted={() => qc.invalidateQueries({ queryKey: ["student-feed", studentId] })} /> : null}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : !posts.length ? (
        <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xxl, alignItems: "center" }}>
          <ImageIcon size={32} color={colors.textFaint} />
          <Text variant="muted" center style={{ marginTop: spacing.md }}>
            {editable ? "Share your first project, demo, or achievement — recruiters see it here." : `${authorName} hasn't posted anything yet.`}
          </Text>
        </View>
      ) : (
        posts.map((post) => {
          const M = KIND_META[post.kind];
          const Icon = M.icon;
          return (
            <Card key={post.id} padded>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Avatar name={authorName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text weight="700" numberOfLines={1}>{authorName}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Icon size={12} color={colors.primary} />
                    <Text variant="caption">{M.label} · {timeAgo(post.created_at)}</Text>
                  </View>
                </View>
                {editable ? (
                  <Pressable onPress={() => del.mutate(post)} hitSlop={8}>
                    <Trash2 size={18} color={colors.textFaint} />
                  </Pressable>
                ) : null}
              </View>

              {post.body ? <Text style={{ marginTop: spacing.md, lineHeight: 21 }}>{post.body}</Text> : null}

              {post.link_url ? (
                <Pressable onPress={() => openLink(post.link_url!)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm, backgroundColor: colors.surface2, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, alignSelf: "flex-start", maxWidth: "100%" }}>
                  <Link2 size={14} color={colors.primary} />
                  <Text color="primary" style={{ fontSize: 12, flexShrink: 1 }} numberOfLines={1}>{post.link_url.replace(/^https?:\/\//, "")}</Text>
                </Pressable>
              ) : null}

              {post.media.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: spacing.md }}>
                  {post.media.map((m) => (
                    <Pressable key={m.id} onPress={() => setLightbox(m)} style={{ width: "32%", aspectRatio: 1, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.surface2 }}>
                      {m.media_type === "video" ? (
                        // Don't render a video file as an image (shows black) — use a play poster.
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface2 }}>
                          <Film size={20} color={colors.textMuted} />
                          <View style={{ position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                            <Play size={16} color={colors.onPrimary} fill={colors.onPrimary} />
                          </View>
                        </View>
                      ) : (
                        <Image source={{ uri: m.signedUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={150} recyclingKey={m.id} />
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.96)", alignItems: "center", justifyContent: "center" }}>
            <Pressable onPress={() => setLightbox(null)} style={{ position: "absolute", top: 50, right: 20, zIndex: 2, padding: 6 }} hitSlop={12}>
              <X size={28} color="#fff" />
            </Pressable>
            {lightbox?.media_type === "video" ? (
              <VideoLightbox uri={lightbox.signedUrl} />
            ) : lightbox ? (
              <>
                <ZoomableImage uri={lightbox.signedUrl} />
                <Text style={{ position: "absolute", bottom: 40, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                  Pinch or double-tap to zoom
                </Text>
              </>
            ) : null}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

function Composer({ studentId, onPosted }: { studentId: string; onPosted: () => void }) {
  const { colors, spacing, radius } = useTheme();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PostKind>("update");
  const [linkUrl, setLinkUrl] = useState("");
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [posting, setPosting] = useState(false);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.9,
    });
    if (!res.canceled) setAssets((prev) => [...prev, ...res.assets].slice(0, 10));
  };

  const reset = () => {
    setBody("");
    setKind("update");
    setLinkUrl("");
    setAssets([]);
    setOpen(false);
  };

  const post = async () => {
    if (!body.trim() && assets.length === 0) return toast.error("Add text or media to post.");
    setPosting(true);
    try {
      const { data: created, error } = await supabase
        .from("student_posts")
        .insert({ student_id: studentId, kind, body: body.trim() || null, link_url: linkUrl.trim() || null })
        .select()
        .single();
      if (error) throw error;

      for (const a of assets) {
        const isImage = (a.type ?? "image") === "image";
        let uploadUri = a.uri;
        let contentType = a.mimeType ?? (isImage ? "image/jpeg" : "video/mp4");
        let ext = (a.fileName?.split(".").pop() || (isImage ? "jpg" : "mp4")).toLowerCase();

        // Downscale + compress images so they upload reliably and load fast.
        if (isImage) {
          const m = await manipulateAsync(a.uri, [{ resize: { width: 1600 } }], { compress: 0.6, format: SaveFormat.JPEG });
          uploadUri = m.uri;
          contentType = "image/jpeg";
          ext = "jpg";
        }

        // Read the real file bytes (RN fetch().arrayBuffer() on a file:// URI yields 0 bytes).
        const bytes = await new File(uploadUri).arrayBuffer();
        const path = `${studentId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from("student_media").insert({
          student_id: studentId,
          post_id: created.id,
          url: path,
          media_type: isImage ? "image" : "video",
          caption: null,
        });
        if (dbErr) throw dbErr;
      }
      toast.success("Posted");
      reset();
      onPosted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  if (!open) {
    return <Button title="New post" onPress={() => setOpen(true)} icon={<Plus size={18} color={colors.onPrimary} />} style={{ alignSelf: "flex-start" }} size="sm" />;
  }

  return (
    <Card padded>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: spacing.md }}>
        {(Object.keys(KIND_META) as PostKind[]).map((k) => {
          const M = KIND_META[k];
          const Icon = M.icon;
          const active = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: active ? colors.primary : colors.cardBorder, backgroundColor: active ? colors.primary + "1A" : "transparent" }}
            >
              <Icon size={13} color={active ? colors.primary : colors.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: active ? colors.primary : colors.textMuted }}>{M.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Input value={body} onChangeText={setBody} placeholder="What did you build? Stack, what you learned…" multiline />
      <Input value={linkUrl} onChangeText={setLinkUrl} placeholder="Demo or repo link (optional)" autoCapitalize="none" containerStyle={{ marginTop: spacing.sm }} icon={<Link2 size={16} color={colors.textFaint} />} />

      {assets.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {assets.map((a, i) => {
              const isVideo = (a.type ?? "image") === "video";
              return (
                <View key={a.uri} style={{ width: 70, height: 70, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
                  {isVideo ? (
                    <Film size={22} color={colors.textMuted} />
                  ) : (
                    <Image source={{ uri: a.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  )}
                  <Pressable onPress={() => setAssets((p) => p.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: 2, right: 2, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 2 }}>
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md }}>
        <Button title="Add media" variant="outline" size="sm" onPress={pick} icon={<ImageIcon size={16} color={colors.text} />} />
        <Text variant="caption">{assets.length}/10</Text>
        <View style={{ flex: 1 }} />
        <Button title="Cancel" variant="ghost" size="sm" onPress={reset} />
        <Button title="Post" size="sm" onPress={post} loading={posting} />
      </View>
    </Card>
  );
}
