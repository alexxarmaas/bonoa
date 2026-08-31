"use client";

import { useEffect } from "react";
import { getWalletIdentity } from "@/lib/wallet-data";
import { supabase } from "@/lib/supabase/client";

export function useWalletRealtime(userId: string | undefined, onWalletChange: () => void) {
  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void getWalletIdentity(userId).then((wallet) => {
      if (disposed || !wallet) return;

      channel = supabase
        .channel(`wallet-passes:${wallet.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "passes",
            filter: `wallet_id=eq.${wallet.id}`,
          },
          () => onWalletChange(),
        )
        .subscribe();
    });

    return () => {
      disposed = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, onWalletChange]);
}
