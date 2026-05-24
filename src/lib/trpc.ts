"use client";

import {
  FEATURED_REVIEWS,
  MENU_ITEMS,
  PROMOTIONS,
  STORE_LOCATIONS,
  WHOLESALE_PRODUCTS,
} from "./mock-data";

type QueryResult<T> = {
  data: T;
  isLoading: false;
  isError: false;
  error: null;
  refetch: () => Promise<void>;
};

type MutationResult = {
  mutate: (input?: unknown) => void;
  mutateAsync: (input?: unknown) => Promise<{ success: boolean; content?: string }>;
  isPending: false;
  isLoading: false;
};

function queryResult<T>(data: T): QueryResult<T> {
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: async () => {},
  };
}

function mutationResult(options?: Record<string, unknown> & {
  onSuccess?: (data?: unknown) => void;
  onError?: (error?: unknown) => void;
  path?: string;
}): MutationResult & {
  mutateAsync: (input?: unknown) => Promise<{ success: boolean; content?: string }>;
} {
  return {
    mutate: (input?: unknown) => {
      options?.onSuccess?.({ success: true, ...(input as object) });
    },
    mutateAsync: async (input?: unknown) => {
      const result =
        options?.path === "public.chat"
          ? {
              success: true,
              content:
                "Thanks for reaching out! For menu details, store hours, and orders, visit our website or call 0416 036 016.",
            }
          : { success: true };
      options?.onSuccess?.(result);
      return result;
    },
    isPending: false,
    isLoading: false,
  };
}

function resolveQuery(path: string[], input?: unknown): unknown {
  const key = path.join(".");

  switch (key) {
    case "public.storeLocations":
      return STORE_LOCATIONS;
    case "public.menu":
      return MENU_ITEMS;
    case "public.popularItems":
      return MENU_ITEMS.filter((item) => item.isPopular);
    case "public.featuredReviews":
      return FEATURED_REVIEWS;
    case "public.wholesaleProducts": {
      const category = (input as { category?: string } | undefined)?.category;
      if (category && category !== "All") {
        return WHOLESALE_PRODUCTS.filter((p) => p.category === category);
      }
      return WHOLESALE_PRODUCTS;
    }
    case "promotions.list":
      return PROMOTIONS;
    case "public.chat":
      return { role: "assistant", content: "Thanks for your message! Our team will be in touch soon." };
    default:
      return [];
  }
}

function createTrpcProxy(path: string[] = []): unknown {
  const handler = () => undefined;

  return new Proxy(handler, {
    get(_target, prop) {
      const key = String(prop);

      if (key === "useQuery") {
        return (..._args: unknown[]) =>
          queryResult(resolveQuery(path, _args[0]));
      }

      if (key === "useMutation") {
        return (options?: { onSuccess?: (data?: unknown) => void }) =>
          mutationResult({ ...options, path: path.join(".") });
      }

      if (key === "useUtils") {
        return () => ({
          invalidate: () => Promise.resolve(),
          public: { menu: { invalidate: () => Promise.resolve() } },
        });
      }

      return createTrpcProxy([...path, key]);
    },
  });
}

/** Static mock tRPC client for public pages until the API is wired up. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = createTrpcProxy();
