import { useEffect, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle,
  Database,
  FileSpreadsheet,
  Upload,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { RunStatusModal } from "../components/ui/RunStatusModal";
import type { CsvStatus, DashboardData, ValidationItem } from "../types/dashboard";
import { analyzeCsvWithAi } from "../lib/ai-api";
import { formatNumber } from "../lib/utils";

type CsvUploadPageProps = {
  csvStatus: CsvStatus;
  onCsvLoaded: (status: CsvStatus, data: DashboardData) => void;
};

const loadingSteps = [
  "판매 이력 파일을 확인하는 중입니다.",
  "비슷한 판매 흐름의 매장을 찾는 중입니다.",
  "상품별 예상 판매량을 계산하는 중입니다.",
  "결과 화면에 보여줄 내용을 정리하는 중입니다.",
];

type AnalysisState = "idle" | "loading" | "complete";

type UploadTargetProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel: string;
  selectedFileName?: string;
  disabled?: boolean;
  isActive: boolean;
  onBrowse: () => void;
  onDropFile: (file: File) => void;
  onDragStateChange: (isDragging: boolean) => void;
};

function UploadTarget({
  icon: Icon,
  title,
  description,
  buttonLabel,
  selectedFileName,
  disabled = false,
  isActive,
  onBrowse,
  onDropFile,
  onDragStateChange,
}: UploadTargetProps) {
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragStateChange(false);
    const file = event.dataTransfer.files[0];
    if (file) onDropFile(file);
  };

  return (
    <div
      className={`flex min-h-[280px] flex-col justify-between rounded-[18px] border border-dashed p-5 transition ${
        isActive ? "border-[#2563EB] bg-[#EFF6FF]" : "border-[rgba(15,23,42,0.12)] bg-slate-50"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        onDragStateChange(true);
      }}
      onDragLeave={() => onDragStateChange(false)}
      onDrop={handleDrop}
    >
      <div>
        <div className="mb-4 inline-flex rounded-2xl bg-white p-3 text-[#2563EB] shadow-sm">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-[#111827]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">{description}</p>
      </div>
      <div className="mt-6 space-y-3">
        {selectedFileName ? (
          <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm">
            <p className="text-xs font-medium text-[#6B7280]">선택된 파일</p>
            <p className="mt-1 break-all font-semibold text-[#111827]">{selectedFileName}</p>
          </div>
        ) : null}
        <Button type="button" onClick={onBrowse} disabled={disabled}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

function ValidationRow({ item }: { item: ValidationItem }) {
  const Icon = item.status === "passed" ? CheckCircle : item.status === "failed" ? XCircle : AlertTriangle;
  const tone = item.status === "passed" ? "success" : item.status === "failed" ? "danger" : "warning";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.08)] py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${item.status === "passed" ? "text-emerald-600" : item.status === "failed" ? "text-red-600" : "text-amber-600"}`} aria-hidden="true" />
        <div>
          <p className="font-medium text-[#1F2937]">{item.label}</p>
          <p className="text-sm text-[#6B7280]">{item.message}</p>
        </div>
      </div>
      <Badge tone={tone}>{item.required ? "필수" : "선택"}</Badge>
    </div>
  );
}

function FullScreenAnalysisOverlay({
  state,
  stepIndex,
  isLeaving,
}: {
  state: Exclude<AnalysisState, "idle">;
  stepIndex: number;
  isLeaving: boolean;
}) {
  const isComplete = state === "complete";

  useEffect(() => {
    if (!isComplete) return;

    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
      window.setTimeout(() => void context.close(), 260);
    } catch {
      // Browser audio policies can block this; the visual completion still works.
    }
  }, [isComplete]);

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/32 px-5 backdrop-blur-md ${isLeaving ? "analysis-overlay-out" : "analysis-overlay-in"}`}>
      <div className={`w-full max-w-[680px] rounded-[42px] border border-white/80 bg-white/95 px-10 py-12 text-center shadow-[0_38px_120px_rgba(15,23,42,0.24)] sm:px-14 sm:py-14 ${isLeaving ? "analysis-modal-out" : "analysis-modal-in"}`}>
        <div className="mx-auto flex h-32 w-32 items-center justify-center">
          {isComplete ? (
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="completion-pulse absolute inset-0 rounded-full bg-emerald-400/20" />
              <svg className="relative h-24 w-24" viewBox="0 0 80 80" aria-hidden="true">
                <circle
                  className="completion-ring"
                  cx="40"
                  cy="40"
                  r="31"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  className="completion-check"
                  d="M25 41.5 35.5 52 56 30"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : (
            <div className="h-24 w-24 animate-spin rounded-full border-[7px] border-blue-100 border-t-blue-600" />
          )}
        </div>

        <h2 className="mt-7 text-3xl font-extrabold tracking-tight text-slate-950 transition-all duration-500">
          {isComplete ? "예측이 완료되었습니다" : loadingSteps[stepIndex]}
        </h2>
        <p className="mx-auto mt-5 max-w-[520px] text-base leading-7 text-slate-500">
          {isComplete
            ? "잠시 후 판매 예측 결과 화면으로 이동합니다."
            : "업로드한 판매 이력을 바탕으로 상품별 예상 판매량을 준비하고 있습니다."}
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function CsvUploadPage({
  csvStatus,
  onCsvLoaded,
}: CsvUploadPageProps) {
  const forecastInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingForecast, setIsDraggingForecast] = useState(false);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [isOverlayLeaving, setIsOverlayLeaving] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const isAnalyzing = analysisState !== "idle";

  useEffect(() => {
    if (analysisState !== "loading") {
      setLoadingStepIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingStepIndex((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [analysisState]);

  const handleForecastFile = async (file: File) => {
    setAnalysisState("loading");
    setIsOverlayLeaving(false);
    setLoadingStepIndex(0);
    setErrorModalOpen(false);
    try {
      const result = await analyzeCsvWithAi(file);
      setLoadingStepIndex(loadingSteps.length - 1);
      setAnalysisState("complete");
      await new Promise((resolve) => window.setTimeout(resolve, 1400));
      setIsOverlayLeaving(true);
      await new Promise((resolve) => window.setTimeout(resolve, 360));
      onCsvLoaded(result.status, result.data);
    } catch (error) {
      void error;
      setIsOverlayLeaving(true);
      await new Promise((resolve) => window.setTimeout(resolve, 240));
      setAnalysisState("idle");
      setIsOverlayLeaving(false);
      setErrorModalOpen(true);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6">
      <RunStatusModal
        open={errorModalOpen}
        mode="error"
        title="판매 예측 계산 중 오류 발생"
        description="판매 이력 파일을 확인하거나 잠시 후 다시 시도해 주세요."
        activeStepId="prediction"
        steps={[
          { id: "upload", label: "파일 확인", description: "올린 판매 이력 파일을 확인합니다." },
          { id: "prediction", label: "판매 예측", description: "다음 날짜 예상 판매량을 계산합니다." },
          { id: "complete", label: "결과 준비", description: "판매 예측 결과 화면을 준비합니다." },
        ]}
        onClose={() => setErrorModalOpen(false)}
      />
      <div className="grid auto-rows-min gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <Card className="p-6">
          <div className="grid gap-4">
            <UploadTarget
              icon={Upload}
              title="예측용 판매 이력 파일"
              description="판매 이력 CSV를 올리면 마지막 날짜 다음 날의 상품별 예상 판매량을 다시 계산합니다."
              buttonLabel={isAnalyzing ? "계산 중..." : "파일 선택"}
              selectedFileName={csvStatus.fileName}
              disabled={isAnalyzing}
              isActive={isDraggingForecast}
              onBrowse={() => forecastInputRef.current?.click()}
              onDropFile={(file) => void handleForecastFile(file)}
              onDragStateChange={setIsDraggingForecast}
            />
          </div>
          <input
            ref={forecastInputRef}
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleForecastFile(file);
                event.currentTarget.value = "";
              }
            }}
          />
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>파일 요약</CardTitle>
              <CardDescription>판매 예측에 사용된 파일입니다.</CardDescription>
            </div>
            <Database className="h-5 w-5 text-[#6B7280]" aria-hidden="true" />
          </CardHeader>
          {csvStatus.state === "empty" ? (
            <EmptyState icon={FileSpreadsheet} title="아직 올린 파일이 없습니다" description="예측용 판매 이력 파일을 올리면 자료 개수, 상품 수, 기간이 표시됩니다." />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#6B7280]">파일명</p>
                <p className="mt-1 break-all font-semibold text-[#111827]">{csvStatus.fileName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-[#6B7280]">자료 개수</p>
                  <p className="mt-1 text-xl font-semibold text-[#111827]">{formatNumber(csvStatus.rowCount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-[#6B7280]">상품 수</p>
                  <p className="mt-1 text-xl font-semibold text-[#111827]">{formatNumber(csvStatus.productCount)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-[#6B7280]">날짜 범위</p>
                <p className="mt-1 text-sm font-medium text-[#111827]">{csvStatus.dateRange ?? "확인 필요"}</p>
              </div>
              <div>
                <p className="text-sm text-[#6B7280]">올린 시각</p>
                <p className="mt-1 text-sm font-medium text-[#111827]">{csvStatus.uploadedAt}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid auto-rows-min gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>필수 항목 확인</CardTitle>
              <CardDescription>판매량 예측에 필요한 항목을 확인합니다.</CardDescription>
            </div>
          </CardHeader>
          {csvStatus.validation.length ? (
            <div>
              {csvStatus.validation.map((item) => (
                <ValidationRow key={item.column} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState icon={CheckCircle} title="확인 대기 중" description="판매 이력 파일을 올리면 필요한 항목이 들어 있는지 확인합니다." />
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>처리 안내</CardTitle>
              <CardDescription>판매량 예측 과정에서 참고할 내용을 알려드립니다.</CardDescription>
            </div>
          </CardHeader>
          {csvStatus.issues.length ? (
            <div className="space-y-3">
              {csvStatus.issues.map((issue) => (
                <div
                  key={issue.message}
                  className={`rounded-2xl border p-4 text-sm ${
                    issue.severity === "error"
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-amber-100 bg-amber-50 text-amber-700"
                  }`}
                >
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                    <p>{issue.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CheckCircle} title="문제 없음" description="현재 업로드 상태에서는 치명적인 오류가 없습니다." />
          )}
        </Card>
      </div>
      {analysisState !== "idle" ? (
        <FullScreenAnalysisOverlay state={analysisState} stepIndex={loadingStepIndex} isLeaving={isOverlayLeaving} />
      ) : null}
    </div>
  );
}
