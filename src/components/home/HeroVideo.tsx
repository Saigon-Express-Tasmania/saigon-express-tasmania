"use client";

import AppImage from "@/components/AppImage";
import { useEffect, useRef, useState } from "react";

const POSTER = "/images/intro-cover.jpg";
const VIDEO_DELAY_MS = 1500;

const SOURCES = [
  { src: "https://cdn.saigonexpress.com.au/videos/intro-960.mp4", type: "video/mp4" },
] as const;

export default function HeroVideo() {
  const [loadVideo, setLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;

    const startLoading = () => {
      if (!cancelled) setLoadVideo(true);
    };

    const timer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(startLoading, { timeout: 2000 });
      } else {
        startLoading();
      }
    }, VIDEO_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!loadVideo) return;

    const video = videoRef.current;
    if (!video) return;

    const onPlaying = () => setVideoReady(true);

    const tryPlay = () => {
      void video.play().catch(() => {
        // Autoplay can still fail in some browsers; show the frame anyway.
        setVideoReady(true);
      });
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", tryPlay);

    // Remote CDN sources: ensure the element starts fetching after mount.
    video.load();

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      tryPlay();
    }

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", tryPlay);
    };
  }, [loadVideo]);

  return (
    <>
      <AppImage
        src={POSTER}
        alt=""
        fill
        priority
        sizes="100vw"
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          videoReady ? "opacity-0" : "opacity-100"
        }`}
      />
      {loadVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
        >
          {SOURCES.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
        </video>
      ) : null}
    </>
  );
}
