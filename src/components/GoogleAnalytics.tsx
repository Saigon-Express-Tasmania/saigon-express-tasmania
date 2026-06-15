import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";
import { ENV } from "@/config/env";

export default function GoogleAnalytics() {
  if (!ENV.gaMeasurementId) {
    return null;
  }

  return <NextGoogleAnalytics gaId={ENV.gaMeasurementId} />;
}
