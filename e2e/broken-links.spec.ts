import { expect, test } from "@playwright/test";
import {
  findBrokenInternalLinks,
  formatBrokenLinks,
} from "./helpers/link-crawler";

test.describe("broken links", () => {
  test("public site has no internal links that return 404 or 5xx", async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(600_000);
    test.skip(!baseURL, "Playwright baseURL is required");

    const brokenLinks = await findBrokenInternalLinks(page, request, baseURL);

    expect(
      brokenLinks,
      brokenLinks.length > 0 ? formatBrokenLinks(brokenLinks) : undefined,
    ).toEqual([]);
  });
});
