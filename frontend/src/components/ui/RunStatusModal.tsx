import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { Button } from "./Button";

export type RunStatusMode = "loading" | "success" | "error";

export type RunStatusStep = {
  id: string;
  label: string;
  description: string;
};

type RunStatusModalProps = {
  open: boolean;
  mode: RunStatusMode;
  title: string;
  description: string;
  activeStepId?: string;
  steps?: RunStatusStep[];
  notice?: string | null;
  onClose?: () => void;
};

function stepState(index: number, activeIndex: number, mode: RunStatusMode) {
  if (mode === "error" && index === activeIndex) return "error";
  if (index < activeIndex || mode === "success") return "done";
  if (index === activeIndex) return "active";
  return "pending";
}

export function RunStatusModal({
  open,
  mode,
  title,
  description,
  activeStepId,
  steps = [],
  notice,
  onClose,
}: RunStatusModalProps) {
  if (!open || typeof document === "undefined") return null;

  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === activeStepId));
  const isLoading = mode === "loading";
  const isError = mode === "error";
  const noticeClassName =
    mode === "success"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : mode === "error"
        ? "border-red-100 bg-red-50 text-red-700"
        : "border-blue-100 bg-blue-50 text-blue-700";

  return createPortal(
    <div className="analysis-overlay-in fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-5 backdrop-blur-md">
      <div className="analysis-modal-in relative w-full max-w-[720px] rounded-[34px] border border-white/80 bg-white/95 px-6 py-8 text-center shadow-[0_38px_120px_rgba(15,23,42,0.28)] sm:px-10 sm:py-10">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
            aria-label="닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}

        <div className="mx-auto flex h-24 w-24 items-center justify-center">
          {isError ? (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600">
              <span className="absolute inset-0 rounded-full bg-red-400/20 motion-safe:animate-ping" />
              <AlertTriangle className="relative h-10 w-10" aria-hidden="true" />
            </div>
          ) : isLoading ? (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <span className="absolute inset-0 rounded-full bg-blue-400/15 motion-safe:animate-ping" />
              <LoaderCircle className="relative h-11 w-11 motion-safe:animate-spin" aria-hidden="true" />
            </div>
          ) : (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <span className="completion-pulse absolute inset-0 rounded-full bg-emerald-400/20" />
              <CheckCircle2 className="relative h-11 w-11" aria-hidden="true" />
            </div>
          )}
        </div>

        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          {isError ? "오류 확인" : isLoading ? "실행 중" : "완료"}
        </p>
        <h2 className="mx-auto mt-3 max-w-[560px] text-2xl font-extrabold leading-tight text-slate-950 sm:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-base leading-7 text-slate-500">
          {description}
        </p>

        {notice ? (
          <div className={`mx-auto mt-5 max-w-[560px] rounded-2xl border px-4 py-3 text-sm font-medium ${noticeClassName}`}>
            {notice}
          </div>
        ) : null}

        {steps.length ? (
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            {steps.map((step, index) => {
              const state = stepState(index, activeIndex, mode);
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    state === "error"
                      ? "border-red-100 bg-red-50"
                      : state === "active"
                        ? "border-blue-100 bg-blue-50"
                        : state === "done"
                          ? "border-emerald-100 bg-emerald-50"
                          : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        state === "error"
                          ? "bg-red-600 text-white"
                          : state === "active"
                            ? "bg-blue-600 text-white"
                            : state === "done"
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {state === "done" ? "✓" : index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{step.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {onClose ? (
          <div className="mt-7 flex justify-center">
            <Button type="button" onClick={onClose}>
              확인
            </Button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
