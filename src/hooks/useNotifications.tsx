import { useCallback, useEffect, useState } from "react";

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

const isSupported = typeof window !== "undefined" && "Notification" in window;

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>(() => {
    if (!isSupported) return "unsupported";
    return Notification.permission as NotificationPermissionState;
  });

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission as NotificationPermissionState);
  }, []);

  const request = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!isSupported) return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result as NotificationPermissionState;
    } catch {
      return "denied";
    }
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions & { onClick?: () => void }) => {
      if (!isSupported || Notification.permission !== "granted") return null;
      try {
        const { onClick, ...rest } = options ?? {};
        const n = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...rest,
        });
        if (onClick) {
          n.onclick = () => {
            window.focus();
            onClick();
            n.close();
          };
        }
        return n;
      } catch {
        return null;
      }
    },
    [],
  );

  return { permission, supported: isSupported, request, notify };
}
