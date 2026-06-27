import { cn } from "@/lib/utils";

const PROSE_CLASS =
  "catering-product-html [&_a]:text-brand-red [&_a]:underline hover:[&_a]:no-underline [&_b]:font-semibold [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4";

type CateringProductHtmlProps = {
  html: string;
  className?: string;
};

export default function CateringProductHtml({
  html,
  className,
}: CateringProductHtmlProps) {
  const trimmed = html.trim();
  if (!trimmed) return null;

  return (
    <div
      className={cn(PROSE_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}
