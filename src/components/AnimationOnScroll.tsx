"use client";

import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export const AnimationOnScroll = () => {
  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: "ease-out-cubic",
      once: true,
      offset: 60,
    });
  }, []);

  return null;
};
