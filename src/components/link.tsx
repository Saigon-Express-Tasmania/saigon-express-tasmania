"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: string;
};

/** Drop-in replacement for wouter's Link, using Next.js routing. */
export default function Link({ href, prefetch = true, ...props }: LinkProps) {
  return <NextLink href={href} prefetch={prefetch} {...props} />;
}
