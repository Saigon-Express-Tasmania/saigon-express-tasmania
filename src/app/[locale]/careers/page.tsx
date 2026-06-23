import Careers from "@/views/Careers";
import { getJobListings } from "@/lib/supabase/job-listings";

export default async function LocaleCareersPage() {
  const jobs = await getJobListings();
  return <Careers jobs={jobs} />;
}
