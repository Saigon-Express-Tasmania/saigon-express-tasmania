"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

type AppImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
  fill?: boolean;
};

const DEFAULT_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw";

/** Next.js Image wrapper for local assets and remotes allowed in next.config.ts (e.g. Supabase Storage). */
export default function AppImage({
  src,
  alt,
  fill = false,
  className,
  sizes,
  priority,
  width,
  height,
  style,
  ...rest
}: AppImageProps) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes ?? DEFAULT_SIZES}
        className={cn("object-cover", className)}
        style={style}
        {...rest}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 1200}
      height={height ?? 800}
      priority={priority}
      sizes={sizes ?? DEFAULT_SIZES}
      className={className}
      style={style}
      {...rest}
    />
  );
}
