"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore, getStoredTheme } from "@/lib/auth";
import { HooshinuError } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) => {
              // Don't retry auth/validation/permission errors.
              if (error instanceof HooshinuError) {
                if ([401, 402, 403, 404, 422].includes(error.status))
                  return false;
              }
              return count < 2;
            },
            refetchOnWindowFocus: false,
            staleTime: 10_000,
          },
        },
      })
  );

  // Hydrate auth token + apply stored theme before paint.
  useEffect(() => {
    hydrate();
    const theme = getStoredTheme();
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [hydrate]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
