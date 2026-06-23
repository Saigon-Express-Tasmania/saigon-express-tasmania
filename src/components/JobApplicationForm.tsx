"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import {
  formatJobApplicationFileSize,
  isJobApplicationFileAllowed,
  JOB_APPLICATION_FILE_INPUT_ACCEPT,
  JOB_APPLICATION_MAX_FILE_BYTES,
} from "@/lib/job-application-files";

export type JobApplicationJob = {
  id: number;
  title: string;
  location: string;
};

type AttachmentState = {
  fileName: string;
  publicUrl: string;
};

type FormState = {
  jobId: string;
  legalFirstName: string;
  legalMiddleNames: string;
  legalLastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  canWorkWeekends: string;
  commuteUnder20Minutes: string;
  workAvailability: string;
  candidateMessage: string;
  agreeToTerms: boolean;
};

const JOB_APPLICATION_LAST_SUBMIT_KEY = "job_application_last_submit_at";
const JOB_APPLICATION_SUBMIT_COOLDOWN_MS = 60 * 1000;

const INITIAL_FORM: FormState = {
  jobId: "",
  legalFirstName: "",
  legalMiddleNames: "",
  legalLastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  canWorkWeekends: "",
  commuteUnder20Minutes: "",
  workAvailability: "",
  candidateMessage: "",
  agreeToTerms: false,
};

const inputClassName =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors";

const labelClassName =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground";

function buildApplicantName(form: FormState): string {
  return [form.legalFirstName, form.legalMiddleNames, form.legalLastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function displayValue(value: string): string {
  const text = value.trim();
  return text || "—";
}

type JobApplicationFormProps = {
  jobs: JobApplicationJob[];
};

export default function JobApplicationForm({ jobs }: JobApplicationFormProps) {
  const t = useTranslations("Careers.applicationForm");
  const tCareers = useTranslations("Careers");
  const searchParams = useSearchParams();
  const guestId = useMemo(() => crypto.randomUUID(), []);
  const { uploadMedia, isUploading } = useSupabaseStorage();

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [resume, setResume] = useState<AttachmentState | null>(null);
  const [coverLetter, setCoverLetter] = useState<AttachmentState | null>(null);
  const [uploadingField, setUploadingField] = useState<
    "resume" | "coverLetter" | null
  >(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const resumeInputId = useId();
  const coverLetterInputId = useId();

  const selectedJob = jobs.find((job) => String(job.id) === form.jobId) ?? null;

  useEffect(() => {
    const requestedJobId = searchParams.get("job")?.trim();
    if (!requestedJobId) return;
    if (!jobs.some((job) => String(job.id) === requestedJobId)) return;
    setForm((prev) =>
      prev.jobId ? prev : { ...prev, jobId: requestedJobId },
    );
  }, [jobs, searchParams]);

  useEffect(() => {
    const updateCooldown = () => {
      const lastSubmitAt = Number(
        window.localStorage.getItem(JOB_APPLICATION_LAST_SUBMIT_KEY) ?? "0",
      );
      const remainingMs =
        lastSubmitAt + JOB_APPLICATION_SUBMIT_COOLDOWN_MS - Date.now();
      setCooldownSeconds(
        remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0,
      );
    };

    updateCooldown();
    const timerId = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (step !== 3) {
      setCanSubmit(false);
      return;
    }

    const timerId = window.setTimeout(() => setCanSubmit(true), 350);
    return () => window.clearTimeout(timerId);
  }, [step]);

  const cooldownLabel = `${Math.floor(cooldownSeconds / 60)}:${String(
    cooldownSeconds % 60,
  ).padStart(2, "0")}`;

  const validateAttachment = (file: File): boolean => {
    if (!isJobApplicationFileAllowed(file)) {
      toast.error(t("messages.invalidFileType"));
      return false;
    }

    if (file.size > JOB_APPLICATION_MAX_FILE_BYTES) {
      toast.error(t("messages.fileTooLarge"));
      return false;
    }

    return true;
  };

  const uploadAttachment = async (
    file: File,
    field: "resume" | "coverLetter",
  ) => {
    if (!validateAttachment(file)) return;

    setUploadingField(field);
    try {
      const { publicUrl } = await uploadMedia(file, { guestId });
      const attachment = { fileName: file.name, publicUrl };
      if (field === "resume") {
        setResume(attachment);
      } else {
        setCoverLetter(attachment);
      }
    } catch {
      toast.error(t("messages.uploadFailed"));
    } finally {
      setUploadingField(null);
    }
  };

  const validateStep1 = (): boolean => {
    if (!form.jobId || !selectedJob) {
      toast.error(t("messages.selectRole"));
      return false;
    }
    if (!form.legalFirstName.trim() || !form.legalLastName.trim() || !form.email.trim()) {
      toast.error(t("messages.validation"));
      return false;
    }
    if (!form.agreeToTerms) {
      toast.error(t("messages.termsRequired"));
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((current) => Math.min(current + 1, 3));
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 1));
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;
    const target = event.target;
    if (target instanceof HTMLElement && target.tagName === "TEXTAREA") return;
    event.preventDefault();
  };

  const submitApplication = async () => {
    if (step !== 3 || !canSubmit) return;
    if (!validateStep1() || !selectedJob) return;

    if (cooldownSeconds > 0) {
      toast.error(t("messages.rateLimit", { time: cooldownLabel }));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await invokeEdgeFunction<{ id: number; submitted: boolean }>(
        "job-application",
        {
          body: {
            p_job_title: selectedJob.title,
            p_job_location: selectedJob.location,
            p_legal_first_name: form.legalFirstName.trim(),
            p_legal_middle_names: form.legalMiddleNames.trim() || null,
            p_legal_last_name: form.legalLastName.trim(),
            p_email: form.email.trim(),
            p_phone: form.phone.trim() || null,
            p_agree_to_terms: true,
            p_resume_url: resume?.publicUrl ?? null,
            p_resume_filename: resume?.fileName ?? null,
            p_cover_letter_url: coverLetter?.publicUrl ?? null,
            p_cover_letter_filename: coverLetter?.fileName ?? null,
            p_date_of_birth: form.dateOfBirth || null,
            p_can_work_weekends: form.canWorkWeekends || null,
            p_commute_under_20_minutes: form.commuteUnder20Minutes || null,
            p_work_availability: form.workAvailability.trim() || null,
            p_candidate_message: form.candidateMessage.trim() || null,
          },
        },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      window.localStorage.setItem(
        JOB_APPLICATION_LAST_SUBMIT_KEY,
        String(Date.now()),
      );
      setCooldownSeconds(
        Math.ceil(JOB_APPLICATION_SUBMIT_COOLDOWN_MS / 1000),
      );
      setSubmitted(true);
    } catch {
      toast.error(t("messages.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, label: t("steps.personalDetails") },
    { number: 2, label: t("steps.additionalQuestions") },
    { number: 3, label: t("steps.reviewSubmit") },
  ];

  const yesNoOptions = [
    { value: "", label: t("fields.selectPlaceholder") },
    { value: "Yes", label: t("fields.yes") },
    { value: "No", label: t("fields.no") },
  ];

  const renderAttachmentField = (
    field: "resume" | "coverLetter",
    attachment: AttachmentState | null,
    inputId: string,
    label: string,
    optionalLabel: string,
  ) => {
    const isFieldUploading = uploadingField === field;

    return (
      <div>
        <label htmlFor={inputId} className={labelClassName}>
          {label}{" "}
          <span className="font-normal normal-case text-muted-foreground">
            {optionalLabel}
          </span>
        </label>
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
          {attachment ? (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {attachment.fileName}
                  </p>
                  <a
                    href={attachment.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {t("fields.viewFile")}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (field === "resume") setResume(null);
                  else setCoverLetter(null);
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("fields.removeFile")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {isFieldUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Upload className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {t("fields.fileHint", {
                    maxSize: formatJobApplicationFileSize(
                      JOB_APPLICATION_MAX_FILE_BYTES,
                    ),
                  })}
                </p>
              </div>
            </label>
          )}
          <input
            id={inputId}
            type="file"
            accept={JOB_APPLICATION_FILE_INPUT_ACCEPT}
            className="sr-only"
            disabled={isFieldUploading || isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void uploadAttachment(file, field);
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <section id="apply" className="py-20 bg-background border-t border-border">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3">
              {t("tag")}
            </p>
            <h2 className="font-serif text-4xl font-bold text-foreground mb-4">
              {t("title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 text-sm">
              {t("description")}
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              {(["step1", "step2", "step3"] as const).map((key) => (
                <div key={key} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{t(`highlights.${key}`)}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-lg text-sm text-muted-foreground">
              {tCareers("cta.equalOpportunity")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            {submitted ? (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="font-serif text-2xl text-foreground mb-2">
                  {t("success.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("success.desc")}
                </p>
              </div>
            ) : (
              <>
                <nav aria-label={t("progressLabel")} className="mb-8">
                  <ol className="grid grid-cols-3 gap-3">
                    {steps.map((item) => {
                      const isActive = step === item.number;
                      const isComplete = step > item.number;
                      return (
                        <li key={item.number}>
                          <div
                            className={`rounded-xl border px-3 py-3 ${
                              isActive || isComplete
                                ? "border-primary/40 bg-primary/5"
                                : "border-border bg-background"
                            }`}
                          >
                            <p
                              className={`text-[10px] font-bold uppercase tracking-wide ${
                                isActive || isComplete
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {t("stepLabel", { step: item.number })}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-foreground">
                              {item.label}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </nav>

                <form
                  onSubmit={(event) => event.preventDefault()}
                  onKeyDown={handleFormKeyDown}
                  className="space-y-5"
                >
                  {step === 1 ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="job-application-role" className={labelClassName}>
                          {t("fields.role")} *
                        </label>
                        <select
                          id="job-application-role"
                          required
                          value={form.jobId}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, jobId: event.target.value }))
                          }
                          className={inputClassName}
                        >
                          <option value="">{t("fields.selectRole")}</option>
                          {jobs.map((job) => (
                            <option key={job.id} value={String(job.id)}>
                              {job.title} — {job.location}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="job-application-first-name" className={labelClassName}>
                            {t("fields.firstName")} *
                          </label>
                          <input
                            id="job-application-first-name"
                            type="text"
                            required
                            value={form.legalFirstName}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                legalFirstName: event.target.value,
                              }))
                            }
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label htmlFor="job-application-middle-names" className={labelClassName}>
                            {t("fields.middleNames")}
                          </label>
                          <input
                            id="job-application-middle-names"
                            type="text"
                            value={form.legalMiddleNames}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                legalMiddleNames: event.target.value,
                              }))
                            }
                            className={inputClassName}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="job-application-last-name" className={labelClassName}>
                          {t("fields.lastName")} *
                        </label>
                        <input
                          id="job-application-last-name"
                          type="text"
                          required
                          value={form.legalLastName}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              legalLastName: event.target.value,
                            }))
                          }
                          className={inputClassName}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="job-application-email" className={labelClassName}>
                            {t("fields.email")} *
                          </label>
                          <input
                            id="job-application-email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, email: event.target.value }))
                            }
                            className={inputClassName}
                          />
                        </div>
                        <div>
                          <label htmlFor="job-application-phone" className={labelClassName}>
                            {t("fields.phone")}
                          </label>
                          <input
                            id="job-application-phone"
                            type="tel"
                            value={form.phone}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, phone: event.target.value }))
                            }
                            className={inputClassName}
                          />
                        </div>
                      </div>

                      {renderAttachmentField(
                        "resume",
                        resume,
                        resumeInputId,
                        t("fields.resume"),
                        t("fields.optional"),
                      )}
                      {renderAttachmentField(
                        "coverLetter",
                        coverLetter,
                        coverLetterInputId,
                        t("fields.coverLetter"),
                        t("fields.optional"),
                      )}

                      <label className="flex items-start gap-3 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={form.agreeToTerms}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              agreeToTerms: event.target.checked,
                            }))
                          }
                          className="mt-1"
                        />
                        <span>{t("fields.terms")}</span>
                      </label>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="job-application-dob" className={labelClassName}>
                          {t("fields.dateOfBirth")}
                        </label>
                        <input
                          id="job-application-dob"
                          type="date"
                          max={new Date().toISOString().slice(0, 10)}
                          value={form.dateOfBirth}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              dateOfBirth: event.target.value,
                            }))
                          }
                          className={inputClassName}
                        />
                      </div>

                      <div>
                        <label htmlFor="job-application-weekends" className={labelClassName}>
                          {t("fields.canWorkWeekends")}
                        </label>
                        <select
                          id="job-application-weekends"
                          value={form.canWorkWeekends}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              canWorkWeekends: event.target.value,
                            }))
                          }
                          className={inputClassName}
                        >
                          {yesNoOptions.map((option) => (
                            <option key={option.value || "empty"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="job-application-commute" className={labelClassName}>
                          {t("fields.commuteUnder20Minutes")}
                        </label>
                        <select
                          id="job-application-commute"
                          value={form.commuteUnder20Minutes}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              commuteUnder20Minutes: event.target.value,
                            }))
                          }
                          className={inputClassName}
                        >
                          {yesNoOptions.map((option) => (
                            <option key={option.value || "empty-commute"} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="job-application-availability" className={labelClassName}>
                          {t("fields.workAvailability")}
                        </label>
                        <input
                          id="job-application-availability"
                          type="text"
                          value={form.workAvailability}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              workAvailability: event.target.value,
                            }))
                          }
                          className={inputClassName}
                        />
                      </div>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                        <p className="font-semibold text-foreground">
                          {buildApplicantName(form)}
                        </p>
                        <p className="mt-1 text-muted-foreground">{form.email}</p>
                        {form.phone.trim() ? (
                          <p className="text-muted-foreground">{form.phone}</p>
                        ) : null}
                        <div className="mt-4 space-y-2 text-muted-foreground">
                          <p>
                            <span className="font-medium text-foreground">
                              {t("fields.role")}:
                            </span>{" "}
                            {selectedJob?.title ?? "—"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">
                              {t("fields.canWorkWeekends")}:
                            </span>{" "}
                            {displayValue(form.canWorkWeekends)}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">
                              {t("fields.commuteUnder20Minutes")}:
                            </span>{" "}
                            {displayValue(form.commuteUnder20Minutes)}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">
                              {t("fields.workAvailability")}:
                            </span>{" "}
                            {displayValue(form.workAvailability)}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">
                              {t("fields.resume")}:
                            </span>{" "}
                            {resume?.fileName ?? "—"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">
                              {t("fields.coverLetter")}:
                            </span>{" "}
                            {coverLetter?.fileName ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="job-application-message" className={labelClassName}>
                          {t("fields.candidateMessage")}
                        </label>
                        <textarea
                          id="job-application-message"
                          rows={5}
                          value={form.candidateMessage}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              candidateMessage: event.target.value,
                            }))
                          }
                          className={`${inputClassName} resize-y`}
                          placeholder={t("fields.candidateMessagePlaceholder")}
                        />
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {t("reviewNote", { jobTitle: selectedJob?.title ?? "" })}
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-3">
                      {step > 1 ? (
                        <button
                          type="button"
                          onClick={goBack}
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t("actions.back")}
                        </button>
                      ) : (
                        <span />
                      )}

                      {step < 3 ? (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={goNext}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                        >
                          {t("actions.next")}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void submitApplication()}
                          disabled={
                            !canSubmit ||
                            isSubmitting ||
                            isUploading ||
                            uploadingField != null ||
                            cooldownSeconds > 0
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t("actions.submitting")}
                            </>
                          ) : cooldownSeconds > 0 ? (
                            t("actions.submitCooldown", { time: cooldownLabel })
                          ) : (
                            <>
                              {t("actions.submit")}
                              <ChevronRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {cooldownSeconds > 0 ? (
                      <p className="text-center text-xs font-semibold text-primary">
                        {t("messages.cooldownWait", { time: cooldownLabel })}
                      </p>
                    ) : null}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
