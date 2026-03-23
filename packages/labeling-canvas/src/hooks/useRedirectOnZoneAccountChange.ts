import { useEffect, useRef } from "react";

import { useRouter } from "@tanstack/react-router";

import { useAuthStore } from "@/store/auth.store";

type Options = {
  enabled?: boolean;
  redirectTo: string;
};

export function useRedirectOnZoneAccountChange({
  enabled = true,
  redirectTo,
}: Options) {
  const router = useRouter();
  const zoneId = useAuthStore((state) => state.identity?.zoneId);
  const accountId = useAuthStore((state) => state.identity?.accountId);
  const prevRef = useRef<{ zoneId?: string; accountId?: string } | null>(null);

  useEffect(() => {
    const next = { zoneId, accountId };
    const prev = prevRef.current;
    prevRef.current = next;

    if (!enabled) {
      return;
    }
    if (!prev) {
      return;
    }
    if (prev.zoneId === next.zoneId && prev.accountId === next.accountId) {
      return;
    }
    router.navigate({ to: redirectTo as never });
  }, [accountId, enabled, redirectTo, router, zoneId]);
}
