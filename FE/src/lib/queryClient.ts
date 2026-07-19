import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        // Don't retry auth/permission errors — the interceptor already handles 401.
        const statusCode = (error as { statusCode?: number } | null)?.statusCode;
        if (statusCode === 401 || statusCode === 403) return false;
        return failureCount < 1;
      },
    },
  },
});

export default queryClient;
