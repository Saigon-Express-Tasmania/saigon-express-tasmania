import type { APIRequestContext, Page } from "@playwright/test";

const CRAWL_SEEDS = ["/", "/vi"] as const;
const MAX_PAGES_TO_CRAWL = 200;
const PAGE_NAVIGATION_TIMEOUT_MS = 45_000;
const LINK_CHECK_CONCURRENCY = 2;

function isBrokenStatus(status: number): boolean {
  return status === 404 || status >= 500;
}

const SKIP_PATH_PREFIXES = ["/api", "/admin", "/_next"] as const;

export type BrokenLink = {
  url: string;
  status: number;
  foundOn: string;
};

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
}

export function isMemberProtectedPath(pathname: string): boolean {
  return /\/member\/.+/.test(normalizePathname(pathname));
}

function pageKey(url: URL): string {
  return `${normalizePathname(url.pathname)}${url.search}`;
}

function shouldSkipPath(pathname: string): boolean {
  const path = normalizePathname(pathname);

  if (isMemberProtectedPath(path)) {
    return true;
  }

  return SKIP_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function shouldCrawlPath(pathname: string): boolean {
  if (shouldSkipPath(pathname)) {
    return false;
  }

  const extension = pathname.split("/").pop()?.split(".").at(1);
  return !extension;
}

function resolveInternalUrl(href: string, base: URL, origin: string): URL | null {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return null;
  }

  try {
    const url = new URL(href, base);
    return url.origin === origin ? url : null;
  } catch {
    return null;
  }
}

function formatBrokenLinks(brokenLinks: BrokenLink[]): string {
  if (brokenLinks.length === 0) {
    return "";
  }

  return brokenLinks
    .map(
      (link) =>
        `${link.url} returned ${link.status} (found on ${link.foundOn})`,
    )
    .join("\n");
}

async function checkLinksForErrors(
  request: APIRequestContext,
  links: Array<{ url: URL; foundOn: string }>,
  checkedLinks: Set<string>,
  brokenLinks: BrokenLink[],
): Promise<void> {
  const pending: Array<{ url: URL; foundOn: string }> = [];

  for (const link of links) {
    const linkKey = pageKey(link.url);
    if (checkedLinks.has(linkKey)) {
      continue;
    }

    checkedLinks.add(linkKey);
    pending.push(link);
  }

  for (let index = 0; index < pending.length; index += LINK_CHECK_CONCURRENCY) {
    const batch = pending.slice(index, index + LINK_CHECK_CONCURRENCY);

    await Promise.all(
      batch.map(async ({ url, foundOn }) => {
        const linkResponse = await request.get(url.href, {
          maxRedirects: 5,
        });

        if (isBrokenStatus(linkResponse.status())) {
          brokenLinks.push({
            url: url.href,
            status: linkResponse.status(),
            foundOn,
          });
        }
      }),
    );
  }
}

export async function findBrokenInternalLinks(
  page: Page,
  request: APIRequestContext,
  baseURL: string,
): Promise<BrokenLink[]> {
  const origin = new URL(baseURL).origin;
  const toVisit = [...CRAWL_SEEDS];
  const visitedPages = new Set<string>();
  const checkedLinks = new Set<string>();
  const brokenLinks: BrokenLink[] = [];

  while (toVisit.length > 0 && visitedPages.size < MAX_PAGES_TO_CRAWL) {
    const nextPath = toVisit.shift();
    if (!nextPath) {
      break;
    }

    const currentUrl = new URL(nextPath, origin);
    const currentKey = pageKey(currentUrl);

    if (visitedPages.has(currentKey) || shouldSkipPath(currentUrl.pathname)) {
      continue;
    }

    visitedPages.add(currentKey);

    let pageStatus = 0;
    let hrefs: string[] = [];

    try {
      const response = await page.goto(currentUrl.href, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_NAVIGATION_TIMEOUT_MS,
      });
      pageStatus = response?.status() ?? 0;

      if (isBrokenStatus(pageStatus)) {
        brokenLinks.push({
          url: currentUrl.href,
          status: pageStatus,
          foundOn: "crawl seed",
        });
        continue;
      }

      hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
        anchors
          .map((anchor) => anchor.getAttribute("href"))
          .filter((href): href is string => Boolean(href)),
      );
    } catch {
      continue;
    }

    const linksToCheck: Array<{ url: URL; foundOn: string }> = [];

    for (const href of hrefs) {
      const linkUrl = resolveInternalUrl(href, currentUrl, origin);
      if (!linkUrl || shouldSkipPath(linkUrl.pathname)) {
        continue;
      }

      linksToCheck.push({ url: linkUrl, foundOn: currentUrl.href });

      const linkKey = pageKey(linkUrl);

      if (
        shouldCrawlPath(linkUrl.pathname) &&
        !visitedPages.has(linkKey) &&
        !toVisit.includes(`${linkUrl.pathname}${linkUrl.search}`)
      ) {
        toVisit.push(`${linkUrl.pathname}${linkUrl.search}`);
      }
    }

    await checkLinksForErrors(request, linksToCheck, checkedLinks, brokenLinks);
  }

  return brokenLinks;
}

export { formatBrokenLinks };
