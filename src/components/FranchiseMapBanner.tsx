"use client";

import { useState } from "react";
import Image from "next/image";

type LabelPosition = {
  x: number;
  y: number;
};

type FranchiseLocationMetric = {
  label: string;
  value: string;
};

type FranchiseMapLocation = {
  name: string;
  location: string;
  description: string;
  metrics: FranchiseLocationMetric[];
  x: number;
  y: number;
  accent: string;
  desktopLaneX: number;
  desktopLabel: LabelPosition;
  mobileLabel: LabelPosition;
};

type MapFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const DESKTOP_MAP_FRAME: MapFrame = {
  left: 0,
  top: 0.08,
  width: 0.58,
  height: 0.84,
};

const MOBILE_MAP_FRAME: MapFrame = {
  left: 0.01,
  top: 0.04,
  width: 0.98,
  height: 0.92,
};

const LOCATION_OFFSET_X = 0.16;
const LOCATION_OFFSET_Y = 0.06;
const DESKTOP_LABEL_OFFSET = 0.03;
const LABEL_LINE_GAP = 1.8;
const MAP_IMAGE_ASPECT_RATIO = 768 / 672;

const FRANCHISE_LOCATIONS: FranchiseMapLocation[] = [
  {
    name: "Gordon Sorell",
    location: "Gordon Sorell (Sorell Plaza)",
    description:
      "Sorell Plaza is located approximately 22 kilometres from Hobart in the heart of Sorell, serving as a key neighbourhood retail hub for the local farming community and travellers heading to the Tasman Peninsula. The centre features accessible amenities and convenient one-level parking. It is anchored by a Coles Supermarket and caters to the community with a range of local services and shops.",
    metrics: [
      { label: "Specialty Retailers", value: "13+" },
      { label: "Net Turnover Per Annum", value: "$42M+ (Estimated)" },
      { label: "Annual Foot Traffic", value: "1.8M (Estimated)" },
    ],
    x: (0.625 + LOCATION_OFFSET_X),
    y: (0.475 + LOCATION_OFFSET_Y),
    accent: "#22d3ee",
    desktopLaneX: 0.49,
    desktopLabel: { x: 0.68, y: 0.47 },
    mobileLabel: { x: 0.72, y: 0.71 },
  },
  {
    name: "Gateway Sorell",
    location: "Gateway Sorell",
    description:
      "Gateway Sorell (Gateway Shopping Centre) is centrally located in the town of Sorell and serves a quasi-public role for the surrounding community. Positioned near historic tourist routes, the site provides convenient retail access for both locals and visitors. The centre currently offers significant redevelopment potential due to its expansive central land footprint.",
    metrics: [
      { label: "Specialty Retailers", value: "10+ (Estimated)" },
      { label: "Net Turnover Per Annum", value: "$30M+ (Estimated)" },
      { label: "Annual Foot Traffic", value: "1.4M (Estimated)" },
    ],
    x: (0.59 + LOCATION_OFFSET_X),
    y: (0.515 + LOCATION_OFFSET_Y),
    accent: "#60a5fa",
    desktopLaneX: 0.48,
    desktopLabel: { x: 0.685, y: 0.563 },
    mobileLabel: { x: 0.72, y: 0.8 },
  },
  {
    name: "Glebe Hill",
    location: "Glebe Hill (Glebe Hill Village)",
    description:
      "Glebe Hill Village is located eight kilometres east of the Hobart CBD in Howrah and serves as a vital retail hub for the rapidly growing Clarence Plains area. Acquired in 2025 for $50.25 million, this 6,002 sqm tech and sustainability-advanced neighbourhood centre ranks in the national top 10 for its high Moving Annual Turnover per square metre. The centre is anchored by a latest-generation Coles, Priceline, a 24-hour McDonald's, and Tasmania's first Liquorland.",
    metrics: [
      { label: "Specialty Retailers", value: "16+" },
      {
        label: "Net Turnover Per Annum",
        value: "$102M+ (Calculated from MAT)",
      },
      { label: "Annual Foot Traffic", value: "3.2M (Estimated)" },
    ],
    x: (0.565 + LOCATION_OFFSET_X),
    y: (0.64 + LOCATION_OFFSET_Y),
    accent: "#2dd4bf",
    desktopLaneX: 0.45,
    desktopLabel: { x: 0.67, y: 0.65 },
    mobileLabel: { x: 0.72, y: 0.89 },
  },
  {
    name: "North Hobart / CBD / Saigon Lounge",
    location: "North Hobart / CBD / Saigon Lounge",
    description:
      "The Hobart CBD and North Hobart retail precinct serves as the primary commercial and cultural destination in southern Tasmania. The area caters to a massive trade population, driven by office workers, local commuters, and robust year-round tourism. The CBD is anchored by major retailers such as Myer, Target, and H&M within central complexes like the Cat & Fiddle Arcade, while also supporting diverse independent hospitality venues and established franchises.",
    metrics: [
      { label: "Specialty Retailers", value: "450+ (Precinct Estimate)" },
      { label: "Net Turnover Per Annum", value: "$950M+ (Precinct Estimate)" },
      { label: "Annual Foot Traffic", value: "10.5M (Precinct Estimate)" },
    ],
    x: (0.475 + LOCATION_OFFSET_X),
    y: (0.73 + LOCATION_OFFSET_Y),
    accent: "#c084fc",
    desktopLaneX: 0.37,
    desktopLabel: { x: 0.695, y: 0.87 },
    mobileLabel: { x: 0.3, y: 0.71 },
  },
  {
    name: "Sandy Bay",
    location: "Sandy Bay",
    description:
      "The Sandy Bay Village precinct, which incorporates retail hubs like Magnet Court, is located south of the Hobart CBD and functions as a significant local service zone. The area caters to a dense residential and university population, offering a mix of commercial buildings, independent liquor stores, and street-level retail. Ongoing urban planning in the precinct is highly focused on integrating public artworks, managing parking infrastructure, and improving pedestrian amenity.",
    metrics: [
      { label: "Specialty Retailers", value: "120+ (Precinct Estimate)" },
      { label: "Net Turnover Per Annum", value: "$180M+ (Precinct Estimate)" },
      { label: "Annual Foot Traffic", value: "4.2M (Precinct Estimate)" },
    ],
    x: (0.45 + LOCATION_OFFSET_X),
    y: (0.72 + LOCATION_OFFSET_Y),
    accent: "#facc15",
    desktopLaneX: 0.45,
    desktopLabel: { x: 0.6, y: 0.735 },
    mobileLabel: { x: 0.3, y: 0.8 },
  },
  {
    name: "Kingston",
    location: "Kingston (Channel Court Shopping Centre)",
    description:
      "Channel Court Shopping Centre is located in the high-growth corridor of Kingston and serves as the largest and only Sub-Regional retail centre south of the Hobart CBD. The expansive 25,000 sqm centre, which sold for $82.5 million, caters to a local population that experienced an 11.8% growth between 2016 and 2021. The centre is anchored by a full-line Woolworths and BIG W, supported by a local Salamanca Fresh grocer, and operates with zero vacancy.",
    metrics: [
      { label: "Specialty Retailers", value: "84" },
      { label: "Net Turnover Per Annum", value: "$150M+" },
      { label: "Annual Foot Traffic", value: "5.8M (Estimated)" },
    ],
    x: (0.38 + LOCATION_OFFSET_X),
    y: (0.79 + LOCATION_OFFSET_Y),
    accent: "#4ade80",
    desktopLaneX: 0.314,
    desktopLabel: { x: 0.665, y: 0.95 },
    mobileLabel: { x: 0.3, y: 0.89 },
  },
];

function getCanvasPoint(frame: MapFrame, x: number, y: number) {
  return {
    x: (frame.left + frame.width * x) * 100,
    y: (frame.top + frame.height * y) * 100,
  };
}

function getRenderedMapRect(
  frame: MapFrame,
  canvasAspectRatio: number,
  fitToImage: boolean,
): MapFrame {
  if (!fitToImage) {
    return frame;
  }

  const fittedWidthFromHeight =
    (frame.height * MAP_IMAGE_ASPECT_RATIO) / canvasAspectRatio;

  if (fittedWidthFromHeight <= frame.width) {
    return {
      left: frame.left + (frame.width - fittedWidthFromHeight) / 2,
      top: frame.top,
      width: fittedWidthFromHeight,
      height: frame.height,
    };
  }

  const fittedHeightFromWidth =
    (frame.width * canvasAspectRatio) / MAP_IMAGE_ASPECT_RATIO;

  return {
    left: frame.left,
    top: frame.top + (frame.height - fittedHeightFromWidth) / 2,
    width: frame.width,
    height: fittedHeightFromWidth,
  };
}

function getConnectorPath(
  point: { x: number; y: number },
  labelX: number,
  labelY: number,
  labelOnRight: boolean,
  laneX?: number,
) {
  const elbowX = laneX ? laneX * 100 : labelOnRight ? labelX - 5 : labelX + 5;
  const anchorX = labelOnRight ? labelX - LABEL_LINE_GAP : labelX + LABEL_LINE_GAP;

  return `M ${point.x} ${point.y} L ${elbowX} ${point.y} L ${elbowX} ${labelY} L ${anchorX} ${labelY}`;
}

function getResolvedLabelX(
  label: LabelPosition,
  labelOnRight: boolean,
  laneX: number | undefined,
  labels: "desktopLabel" | "mobileLabel",
) {
  if (labels === "desktopLabel" && laneX !== undefined) {
    return (laneX + (labelOnRight ? DESKTOP_LABEL_OFFSET : -DESKTOP_LABEL_OFFSET)) * 100;
  }

  return label.x * 100;
}

function MapGraphic({
  frame,
  aspectClassName,
  canvasAspectRatio,
  labels,
  showCallouts = true,
  activeLocationName,
  onSelectLocation,
  fitMapToImage = false,
}: {
  frame: MapFrame;
  aspectClassName: string;
  canvasAspectRatio: number;
  labels: "desktopLabel" | "mobileLabel";
  showCallouts?: boolean;
  activeLocationName?: string | null;
  onSelectLocation?: (location: FranchiseMapLocation) => void;
  fitMapToImage?: boolean;
}) {
  const renderedMapRect = getRenderedMapRect(
    frame,
    canvasAspectRatio,
    fitMapToImage,
  );

  return (
    <div className={`relative w-full ${aspectClassName}`}>
      <div
        className="absolute"
        style={{
          left: `${renderedMapRect.left * 100}%`,
          top: `${renderedMapRect.top * 100}%`,
          width: `${renderedMapRect.width * 100}%`,
          height: `${renderedMapRect.height * 100}%`,
        }}
      >
        <Image
          src="/images/tasmania_map_fill.png"
          alt=""
          fill
          sizes="(min-width: 1024px) 500px, calc(100vw - 4rem)"
          className="object-contain opacity-90"
        />
        <div
          aria-label="Outline map of Tasmania"
          role="img"
          className="absolute inset-0 drop-shadow-[0_14px_30px_rgba(78,47,4,0.28)]"
          style={{
            background:
              "linear-gradient(180deg, #f1b54d 0%, #E69F20 42%, #8a5a0d 100%)",
            WebkitMaskImage: "url('/images/tasmania_outline_map.png')",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            WebkitMaskSize: "contain",
            maskImage: "url('/images/tasmania_outline_map.png')",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskSize: "contain",
            maskMode: "luminance",
          }}
        />
      </div>

      {showCallouts ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          shapeRendering="geometricPrecision"
          aria-hidden="true"
        >
          {FRANCHISE_LOCATIONS.map((location) => {
            const point = getCanvasPoint(renderedMapRect, location.x, location.y);
            const label = location[labels];
            const labelOnRight = label.x * 100 >= point.x;
            const laneX =
              labels === "desktopLabel" ? location.desktopLaneX : undefined;
            const labelX = getResolvedLabelX(
              label,
              labelOnRight,
              laneX,
              labels,
            );
            const labelY = label.y * 100;

            return (
              <g key={`${location.name}-line-${labels}`}>
                <path
                  d={getConnectorPath(point, labelX, labelY, labelOnRight, laneX)}
                  fill="none"
                  stroke="rgba(255,255,255,0.98)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={getConnectorPath(point, labelX, labelY, labelOnRight, laneX)}
                  fill="none"
                  stroke="#E69F20"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      ) : null}

      {FRANCHISE_LOCATIONS.map((location) => {
        const point = getCanvasPoint(renderedMapRect, location.x, location.y);
        const label = location[labels];
        const labelOnRight = label.x * 100 >= point.x;
        const laneX =
          labels === "desktopLabel" ? location.desktopLaneX : undefined;
        const resolvedLabelX = getResolvedLabelX(
          label,
          labelOnRight,
          laneX,
          labels,
        );

        return (
          <div key={`${location.name}-${labels}`}>
            <button
              type="button"
              aria-label={`View details for ${location.name}`}
              aria-pressed={activeLocationName === location.name}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:scale-110"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onClick={() => onSelectLocation?.(location)}
            >
              <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/35 animate-ping" />
              <span
                className={`absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-red-600 shadow-[0_0_18px_rgba(220,38,38,0.65)] transition-transform duration-200 ${
                  activeLocationName === location.name ? "scale-125" : ""
                }`}
              />
            </button>

            {showCallouts ? (
              <button
                type="button"
                aria-label={`View details for ${location.name}`}
                className={`absolute z-20 -translate-y-1/2 cursor-pointer transition-transform duration-200 hover:scale-[1.03] focus:outline-none focus-visible:scale-[1.03] ${
                  labelOnRight ? "" : "-translate-x-full text-right"
                }`}
                style={{
                  left: `${resolvedLabelX}%`,
                  top: `${label.y * 100}%`,
                }}
                onClick={() => onSelectLocation?.(location)}
              >
                <span
                  className="inline-block text-sm font-bold tracking-[0.08em] sm:text-base"
                  style={{
                    color: "#ffffff",
                    WebkitTextStroke: "2px #E69F20",
                    paintOrder: "stroke fill",
                    textShadow:
                      "0 4px 16px rgba(0,0,0,0.36), 0 1px 0 rgba(0,0,0,0.24), 0 0 14px rgba(0,0,0,0.16)",
                  }}
                >
                  {location.name}
                </span>
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function FranchiseMapBanner() {
  const [selectedLocation, setSelectedLocation] =
    useState<FranchiseMapLocation | null>(null);

  return (
    <div
      className={`relative mb-10 rounded-[2.5rem] min-h-[200px] sm:min-h-[320px] lg:mb-12 lg:min-h-[380px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] ${
        selectedLocation ? "overflow-visible lg:overflow-hidden" : "overflow-hidden"
      }`}
    >
      <Image
        src="/images/franchise_map_background.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-brand-dark/10" />

      <div className="relative z-10 flex min-h-[200px] items-center justify-center px-4 py-6 sm:min-h-[320px] sm:px-6 sm:py-10 lg:min-h-[380px] lg:justify-start lg:px-8 lg:py-12 xl:px-12">
        <div
          className={`w-full transition-all duration-500 ${
            selectedLocation
              ? "pointer-events-none opacity-0 blur-[2px]"
              : "opacity-100"
          }`}
        >
          <div className="mx-auto w-[80vw] max-w-[560px] lg:hidden">
            <MapGraphic
              frame={MOBILE_MAP_FRAME}
              aspectClassName="aspect-[768/700]"
              canvasAspectRatio={1}
              labels="mobileLabel"
              showCallouts={false}
              activeLocationName={selectedLocation?.name ?? null}
              onSelectLocation={setSelectedLocation}
              fitMapToImage
            />
          </div>

          <div className="hidden w-full max-w-[860px] lg:ml-[4%] lg:block xl:ml-[8%]">
            <MapGraphic
              frame={DESKTOP_MAP_FRAME}
              aspectClassName="aspect-[980/520]"
              canvasAspectRatio={1}
              labels="desktopLabel"
              activeLocationName={selectedLocation?.name ?? null}
              onSelectLocation={setSelectedLocation}
            />
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-x-0 top-0 z-20 transition-all duration-500 lg:inset-0 ${
          selectedLocation
            ? "opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        onClick={() => setSelectedLocation(null)}
      >
        <div className="absolute inset-0 rounded-[2.5rem] bg-brand-dark/20 backdrop-blur-[1px]" />

        <div className="relative flex w-full p-4 sm:p-6 lg:h-full lg:p-8">
          <div
            className="flex w-full flex-col rounded-[2.5rem] border border-white/20 bg-brand-dark/72 p-6 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-8 lg:h-full lg:p-10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                  style={{ backgroundColor: selectedLocation?.accent ?? "#E69F20" }}
                />
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-amber/90">
                  Location Details
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                className="cursor-pointer rounded-full border border-white/20 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white/14"
              >
                Back To Map
              </button>
            </div>

            <h3 className="mb-4 font-serif text-3xl leading-tight text-white sm:text-4xl">
              {selectedLocation?.location}
            </h3>

            <p className="max-w-3xl text-sm leading-relaxed text-white/78 sm:text-base">
              {selectedLocation?.description}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {selectedLocation?.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/12 bg-white/6 p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.5)]"
                >
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-amber/80">
                    {metric.label}
                  </p>
                  <p className="text-base font-semibold leading-snug text-white sm:text-lg">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-auto pt-8 text-xs leading-relaxed text-white/55 sm:text-sm">
              <span className="font-semibold text-white/72">Disclaimer:</span>{" "}
              Please note the information above is provided by the landlord. All
              sales and traffic numbers provided are not in any way a
              representation of potential outcomes on the proposed Roll&apos;d
              site or any other future sites. The images supplied are intended
              to convey a similar aesthetic and ambience, rather than
              representing the exact store design.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
