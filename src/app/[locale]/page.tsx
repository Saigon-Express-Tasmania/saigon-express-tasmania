import { Suspense } from "react";
import HomeJsonLdLoader from "@/components/home/HomeJsonLdLoader";
import Home from "@/views/Home";

export default function LocaleHomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <HomeJsonLdLoader />
      </Suspense>
      <Home />
    </>
  );
}
