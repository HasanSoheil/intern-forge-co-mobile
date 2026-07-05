import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/theme";

type ToastType = "success" | "error" | "warning" | "info";
interface ToastItem {
  message: string;
  type: ToastType;
}

interface ToastApi {
  show: (message: string, type?: ToastType) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  warning: (m: string) => void;
  info: (m: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, type });
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2800);
    },
    [anim],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const api: ToastApi = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    warning: (m) => show(m, "warning"),
    info: (m) => show(m, "info"),
  };

  const accent: Record<ToastType, string> = {
    success: colors.success,
    error: colors.destructive,
    warning: colors.warning,
    info: colors.accent,
  };
  const Icon = toast?.type === "success" ? CheckCircle2 : toast?.type === "error" ? XCircle : toast?.type === "warning" ? AlertTriangle : Info;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: spacing.lg,
            right: spacing.lg,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.backgroundElevated,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: accent[toast.type] + "66",
              borderLeftWidth: 4,
              borderLeftColor: accent[toast.type],
              padding: spacing.md,
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Icon size={20} color={accent[toast.type]} />
            <Text style={{ flex: 1, color: colors.text, fontWeight: "600", fontSize: 14 }}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
