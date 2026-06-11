import AppImage from "@/components/AppImage";

export default function WholesaleCartItemThumbnail({
  imageUrl,
  alt,
  size = "md",
}: {
  imageUrl?: string | null;
  alt: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-12 w-12" : "h-14 w-14";

  return (
    <div
      className={`relative ${dim} shrink-0 overflow-hidden rounded-lg bg-white/10`}
    >
      {imageUrl ? (
        <AppImage src={imageUrl} alt={alt} fill className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg opacity-60">
          📦
        </div>
      )}
    </div>
  );
}
