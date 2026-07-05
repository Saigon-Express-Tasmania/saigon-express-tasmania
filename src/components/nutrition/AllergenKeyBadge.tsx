import AllergenKeyIcon from "@/components/nutrition/AllergenKeyIcon";

type AllergenKeyBadgeProps = {
  src: string;
  variant?: "default" | "dairy" | "halal";
};

const BADGE_SIZE = 84;
const FRAMED_ICON_SIZE = 52;

export default function AllergenKeyBadge({
  src,
  variant = "default",
}: AllergenKeyBadgeProps) {
  if (variant === "dairy") {
    return (
      <div
        className="mx-auto mb-3 grid place-items-center rounded-full bg-[#E8B14C] shadow-[0_4px_14px_rgba(0,0,0,0.22)]"
        style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
      >
        <AllergenKeyIcon
          src={src}
          size={FRAMED_ICON_SIZE}
          className="h-[52px] w-[52px]"
        />
      </div>
    );
  }

  if (variant === "halal") {
    return (
      <div
        className="mx-auto mb-3 grid place-items-center rounded-full bg-gradient-to-br from-[#00b359] to-[#006b3f] shadow-[0_4px_14px_rgba(0,107,63,0.35)]"
        style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
      >
        <div className="grid h-[68px] w-[68px] place-items-center rounded-full border-[3px] border-white">
          <AllergenKeyIcon
            src={src}
            onColor
            size={FRAMED_ICON_SIZE}
            className="h-[52px] w-[52px]"
          />
        </div>
      </div>
    );
  }

  return (
    <AllergenKeyIcon
      src={src}
      size={BADGE_SIZE}
      className="mx-auto mb-3 h-[84px] w-[84px] drop-shadow-[0_4px_14px_rgba(0,0,0,0.22)]"
    />
  );
}
