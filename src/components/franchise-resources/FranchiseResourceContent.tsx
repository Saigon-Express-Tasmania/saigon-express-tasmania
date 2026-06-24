"use client";

import AppImage from "@/components/AppImage";
import { CategoryIcon } from "@/components/CategoryIcon";
import FranchiseResourceContentFileViewer from "@/components/franchise-resources/FranchiseResourceContentFileViewer";
import type { FranchiseResourceContentData } from "@/types/franchise-resources";
import { normalizeAttachedFiles } from "@/types/franchise-resources";
import { cn } from "@/lib/utils";
import {
  Clock,
  Download,
  ExternalLink,
  FileText,
  Tag,
} from "lucide-react";
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
}: {
  files: ReturnType<typeof normalizeAttachedFiles>;
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
          return (
            <li key={`${file.url}-${file.name}`}>
              <a
                href={file.url}
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
};

export default function FranchiseResourceContent({
  resource,
  className,
}: FranchiseResourceContentProps) {
  const attachedFiles = normalizeAttachedFiles(resource.attached_files);
  const publishedLabel = formatDisplayDate(
    resource.published_at ?? resource.created_at,
  );
  const contentText = resource.content?.trim() ?? "";
  const videoUrl = resource.video_file?.trim() ?? "";
  const contentFileUrl = resource.content_file?.trim() ?? "";
  const summaryText = resource.summary?.trim() ?? "";
  const descriptionText = resource.description?.trim() ?? "";
  const tags = resource.tags?.filter((tag) => tag.trim()) ?? [];

  return (
    <article className={cn("space-y-6", className)}>
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex items-start gap-4">
          {resource.icon ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/50 text-xl">
              <CategoryIcon icon={resource.icon} className="h-6 w-6" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
              {resource.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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

        {resource.thumbnail_url?.trim() ? (
          <div className="relative aspect-[21/9] overflow-hidden rounded-lg border border-border">
            <AppImage
              src={resource.thumbnail_url.trim()}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        ) : null}

        {summaryText ? (
          <p className="text-base font-medium text-foreground">{summaryText}</p>
        ) : null}

        {descriptionText ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
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

      {videoUrl ? (
        <section>
          <ResourceVideoPlayer url={videoUrl} title={resource.title} />
        </section>
      ) : null}

      {contentText ? (
        <section>
          <ResourceBodyContent
            content={contentText}
            contentFormat={resource.content_format ?? "html"}
          />
        </section>
      ) : null}

      {contentFileUrl ? (
        <section>
          <FranchiseResourceContentFileViewer
            url={contentFileUrl}
            title={resource.title}
          />
        </section>
      ) : null}

      <AttachedFilesList files={attachedFiles} />
    </article>
  );
}
