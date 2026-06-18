import { serializeHomeJsonLd } from "@/lib/json-ld/homepage";
import type { StoreLocation } from "@/types";

type HomeJsonLdProps = {
  storeLocations: StoreLocation[];
};

export default function HomeJsonLd({ storeLocations }: HomeJsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeHomeJsonLd(storeLocations),
      }}
    />
  );
}
