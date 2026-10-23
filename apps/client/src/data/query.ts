import { MutationObserver, QueryClient, type MutationKey } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // The durable sync queue owns reconnects; requests must settle while offline.
      networkMode: "always",
    },
    mutations: { retry: false, networkMode: "always", gcTime: 0 },
  },
});

export async function executeMutation<A>(mutationKey: MutationKey, mutationFn: () => Promise<A>) {
  const observer = new MutationObserver<A, Error, void>(queryClient, {
    mutationKey,
    mutationFn,
  });
  try {
    return await observer.mutate();
  } finally {
    observer.reset();
  }
}

export async function clearRequestCache() {
  await queryClient.cancelQueries();
  queryClient.clear();
}
