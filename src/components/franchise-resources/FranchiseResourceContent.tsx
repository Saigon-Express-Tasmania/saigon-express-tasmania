"use client";

import AppImage from "@/components/AppImage";
import { CategoryIcon } from "@/components/CategoryIcon";
import FranchiseResourceContentFileViewer from "@/components/franchise-resources/FranchiseResourceContentFileViewer";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import type { FranchiseResourceContentData } from "@/types/franchise-resources";
import {
  normalizeAttachedFiles,
  resolveFranchiseResourceFileUrl,
} from "@/types/franchise-resources";
import { cn } from "@/lib/utils";
import {
  Clock,
  Download,
  ExternalLink,
  FileText,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

const PROSE_CLASS =
  "resource-prose space-y-4 text-foreground leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-bold [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-4 [&_p]:text-muted-foreground [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-4";

function formatDisplayDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatFileSize(bytes: number | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ResourceBodyContent({
  content,
  contentFormat,
}: {
  content: string;
  contentFormat: string;
}) {
  const format = contentFormat === "markdown" || contentFormat === "plain"
    ? contentFormat
    : "html";

  if (format === "markdown") {
    return (
      <div className={PROSE_CLASS}>
        <Streamdown>{content}</Streamdown>
      </div>
    );
  }

  if (format === "plain") {
    return (
      <div className={`${PROSE_CLASS} whitespace-pre-wrap`}>{content}</div>
    );
  }

  return (
    <div
      className={PROSE_CLASS}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

function ResourceVideoPlayer({ url, title }: { url: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
        aria-label={`Video: ${title}`}
      >
        <track kind="captions" />
        Your browser does not support embedded video playback.
      </video>
    </div>
  );
}

function AttachedFilesList({
  files,
  resolveUrl,
}: {
  files: ReturnType<typeof normalizeAttachedFiles>;
  resolveUrl: (url: string) => string;
}) {
  if (files.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-muted-foreground" />
        Attachments
      </h3>
      <ul className="space-y-2">
        {files.map((file) => {
          const sizeLabel = formatFileSize(file.size_bytes);
          const fileUrl = resolveUrl(file.url);
          return (
            <li key={`${file.url}-${file.name}`}>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:bg-secondary/60"
              >
                <span className="min-w-0 truncate font-medium text-foreground">
                  {file.name}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {sizeLabel ? <span>{sizeLabel}</span> : null}
                  <Download className="h-3.5 w-3.5" />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export type FranchiseResourceContentProps = {
  resource: FranchiseResourceContentData;
  className?: string;
  /** Hub embed: prioritises file viewer height on small screens. */
  layout?: "default" | "hub";
  /** When false, skips the title/meta header (e.g. when shown in a sidebar). */
  hideHeader?: boolean;
  /** When true, renders the video above the file viewer and body content. */
  videoFirst?: boolean;
  /** Rendered to the right of the document title (hub actions). */
  titleAction?: ReactNode;
};

export default function FranchiseResourceContent({
  resource,
  className,
  layout = "default",
  hideHeader = false,
  videoFirst = false,
  titleAction,
}: FranchiseResourceContentProps) {
  const { getPublicUrl } = useSupabaseStorage();
  const resolveUrl = useCallback(
    (url: string) => resolveFranchiseResourceFileUrl(url, getPublicUrl),
    [getPublicUrl],
  );
  const isHubLayout = layout === "hub";
  const hasFilePreview = Boolean(resource.content_file?.trim());
  const attachedFiles = normalizeAttachedFiles(resource.attached_files);
  const publishedLabel = formatDisplayDate(
    resource.published_at ?? resource.created_at,
  );
  const contentText = resource.content?.trim() ?? "";
  const videoUrl = useMemo(
    () =>
      resource.video_file?.trim()
        ? resolveUrl(resource.video_file.trim())
        : "",
    [resource.video_file, resolveUrl],
  );
  const contentFileUrl = resource.content_file?.trim() ?? "";
  const thumbnailUrl = useMemo(
    () =>
      resource.thumbnail_url?.trim()
        ? resolveUrl(resource.thumbnail_url.trim())
        : "",
    [resource.thumbnail_url, resolveUrl],
  );
  const summaryText = resource.summary?.trim() ?? "";
  const descriptionText = resource.description?.trim() ?? "";
  const tags = resource.tags?.filter((tag) => tag.trim()) ?? [];

  const filePreviewSection = contentFileUrl ? (
    <section
      className={cn(
        isHubLayout && "flex min-h-0 min-w-0 flex-1 flex-col",
        isHubLayout && "max-xl:-mx-3 sm:max-xl:-mx-6",
      )}
    >
      <FranchiseResourceContentFileViewer
        url={contentFileUrl}
        title={resource.title}
        fillHeight={isHubLayout}
        externalBottomBar={isHubLayout}
      />
    </section>
  ) : null;

  const videoSection = videoUrl ? (
    <section className={cn(isHubLayout && "shrink-0")}>
      <ResourceVideoPlayer url={videoUrl} title={resource.title} />
    </section>
  ) : null;

  return (
    <article
      className={cn(
        "min-w-0",
        isHubLayout
          ? "flex min-h-0 flex-1 flex-col gap-4 sm:gap-6"
          : "space-y-6",
        className,
      )}
    >
      <header
        className={cn(
          "shrink-0 space-y-3 border-b border-border sm:space-y-4",
          isHubLayout ? "pb-3 sm:pb-6" : "pb-6",
          isHubLayout && hasFilePreview && "max-sm:space-y-2 max-sm:pb-3",
          hideHeader && "hidden",
        )}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          {resource.icon ? (
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/50 text-xl",
                isHubLayout ? "h-10 w-10 sm:h-12 sm:w-12" : "h-12 w-12",
              )}
            >
              <CategoryIcon
                icon={resource.icon}
                className={isHubLayout ? "h-5 w-5 sm:h-6 sm:w-6" : "h-6 w-6"}
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h1
                className={cn(
                  "min-w-0 font-serif font-bold text-foreground",
                  isHubLayout
                    ? "text-xl leading-tight sm:text-3xl"
                    : "text-2xl sm:text-3xl",
                )}
              >
                {resource.title}
              </h1>
              {titleAction ? (
                <div className="shrink-0">{titleAction}</div>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:mt-2 sm:gap-x-4 sm:text-sm">
              {resource.author_name?.trim() ? (
                <span>{resource.author_name.trim()}</span>
              ) : null}
              {publishedLabel ? <span>{publishedLabel}</span> : null}
              {resource.version?.trim() ? (
                <span>Version {resource.version.trim()}</span>
              ) : null}
              {resource.estimated_read_minutes != null &&
              resource.estimated_read_minutes > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {resource.estimated_read_minutes} min read
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {thumbnailUrl ? (
          <div
            className={cn(
              "relative aspect-[21/9] overflow-hidden rounded-lg border border-border",
              isHubLayout && hasFilePreview && "max-sm:aspect-[2/1]",
            )}
          >
            <AppImage
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        ) : null}

        {summaryText ? (
          <p
            className={cn(
              "font-medium text-foreground",
              isHubLayout ? "text-sm sm:text-base" : "text-base",
            )}
          >
            {summaryText}
          </p>
        ) : null}

        {descriptionText ? (
          <p
            className={cn(
              "leading-relaxed text-muted-foreground",
              isHubLayout && hasFilePreview && "max-sm:line-clamp-2 max-sm:text-xs",
              !isHubLayout || !hasFilePreview ? "text-sm" : "text-sm sm:text-sm",
            )}
          >
            {descriptionText}
          </p>
        ) : null}

        {resource.external_url?.trim() ? (
          <a
            href={resource.external_url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Open external resource
          </a>
        ) : null}
      </header>

      {videoFirst ? (
        <>
          {videoSection}
          {filePreviewSection}
        </>
      ) : (
        <>
          {filePreviewSection}
          {videoSection}
        </>
      )}

      {contentText ? (
        <section className={cn(isHubLayout && "shrink-0")}>
          <ResourceBodyContent
            content={contentText}
            contentFormat={resource.content_format ?? "html"}
          />
        </section>
      ) : null}

      <div className={cn(isHubLayout && "shrink-0")}>
        <AttachedFilesList files={attachedFiles} resolveUrl={resolveUrl} />
      </div>
    </article>
  );
}
