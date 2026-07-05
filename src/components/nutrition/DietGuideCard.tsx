import Image from "next/image";
import Link from "@/components/link";
import { nutritionCardHover } from "@/lib/nutrition-palette";

export type DietGuideCardProps = {
  href: string;
  title: string;
  description: string;
  image: string;
  overlayGradient: string;
};

export default function DietGuideCard({
  href,
  title,
  description,
  image,
  overlayGradient,
}: DietGuideCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-2xl text-white no-underline transition-all duration-200 sm:min-h-[340px] lg:min-h-[400px] ${nutritionCardHover}`}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 280px"
        className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div
        className="absolute inset-x-0 bottom-0 z-[1] h-[70%]"
        style={{ background: overlayGradient }}
        aria-hidden
      />
      <div className="relative z-[2] flex flex-col gap-3 p-6">
        <h3 className="font-serif text-2xl font-black">{title}</h3>
        <p className="flex-grow text-[0.95rem] font-light leading-snug opacity-95">
          {description}
        </p>
        <span className="mt-1 inline-flex items-center text-[0.9rem] font-semibold tracking-wide">
          Explore dishes →
        </span>
      </div>
    </Link>
  );
}
