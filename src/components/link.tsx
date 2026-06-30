"use client";

import type { ComponentProps } from "react";
import { Link as IntlLink } from "@/i18n/navigation";

type LinkProps = Omit<ComponentProps<typeof IntlLink>, "href"> & {
  href: string;
};

/** Locale-aware Next.js link (next-intl). */
export default function Link({ href, prefetch = true, ...props }: LinkProps) {
  return <IntlLink href={href} prefetch={prefetch} {...props} />;
}
