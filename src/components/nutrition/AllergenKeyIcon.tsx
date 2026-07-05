import Image from "next/image";
import { cn } from "@/lib/utils";

type AllergenKeyIconProps = {
  src: string;
  /** Pixel width/height passed to next/image. */
  size?: number;
  /** Renders icon white (for halal badge on green background). */
  onColor?: boolean;
  className?: string;
};

export default function AllergenKeyIcon({
  src,
  size = 20,
  onColor = false,
  className,
}: AllergenKeyIconProps) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn(
        "shrink-0 object-contain",
        onColor && "brightness-0 invert",
        className,
      )}
    />
  );
}
