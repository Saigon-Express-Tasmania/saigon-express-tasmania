"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type JobApplicationJob = {
  id: number;
  title: string;
  location: string;
  salary: string;
};

const EMPTY_VALUE = "__empty__";

type JobApplicationRoleSelectProps = {
  id: string;
  jobs: JobApplicationJob[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
};

const triggerClassName =
  "h-auto min-h-[46px] rounded-xl border-border bg-background px-4 py-3 text-sm shadow-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 data-[placeholder]:text-muted-foreground [&>svg]:text-muted-foreground";

const contentClassName =
  "max-h-80 rounded-xl border-border bg-background text-foreground shadow-lg";

const itemClassName =
  "cursor-pointer rounded-lg py-3 pl-3 pr-3 focus:bg-primary/5 data-[highlighted]:bg-primary/5 data-[state=checked]:bg-primary/5";

function formatRoleSummary(job: JobApplicationJob): string {
  return `${job.title} — ${job.location} · ${job.salary}`;
}

export default function JobApplicationRoleSelect({
  id,
  jobs,
  value,
  onValueChange,
  placeholder,
}: JobApplicationRoleSelectProps) {
  const selectedJob =
    jobs.find((job) => String(job.id) === value) ?? null;
  const selectValue = value || EMPTY_VALUE;

  return (
    <Select
      value={selectValue}
      onValueChange={(next) =>
        onValueChange(next === EMPTY_VALUE ? "" : next)
      }
    >
      <SelectTrigger id={id} className={triggerClassName} aria-required>
        <SelectValue placeholder={placeholder}>
          {selectedJob ? (
            <span className="line-clamp-2 text-left leading-snug">
              {formatRoleSummary(selectedJob)}
            </span>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={contentClassName} position="popper">
        <SelectItem value={EMPTY_VALUE} className={itemClassName}>
          <span className="text-muted-foreground">{placeholder}</span>
        </SelectItem>
        {jobs.map((job) => (
          <SelectItem
            key={job.id}
            value={String(job.id)}
            className={itemClassName}
            textValue={formatRoleSummary(job)}
          >
            <span className="flex w-full min-w-0 items-start justify-between gap-4">
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-snug text-foreground">
                  {job.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {job.location}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-right text-xs font-medium text-muted-foreground",
                  "group-data-[state=checked]:text-primary",
                )}
              >
                {job.salary}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
