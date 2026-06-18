import { createPage } from "@/lib/create-page";
import { pageMetadata } from "@/lib/seo-metadata";
import FranchisePage from "@/views/FranchisePage";

export const metadata = pageMetadata("franchise");

export default createPage(FranchisePage);

