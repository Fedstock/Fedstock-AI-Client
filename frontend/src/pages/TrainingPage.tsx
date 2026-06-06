import { useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  FileUp,
  LoaderCircle,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { RunStatusModal, type RunStatusStep } from "../components/ui/RunStatusModal";
import { analyzeCsvWithAi, fetchLocalState, fetchTrainingStatus, startTrainingWithAi } from "../lib/ai-api";
import type { CsvStatus, DashboardData, LocalState, TrainingStatus } from "../types/dashboard";

type RunStageId = "upload" | "preprocess" | "importance" | "localTraining" | "centralSync" | "prediction" | "complete";

type RunModalError = {
  stageId: RunStageId;
  title: string;
  description: string;
};

const runSteps: RunStatusStep[] = [
  { id: "upload", label: "파일 확인", description: "올린 판매 이력 파일을 확인합니다." },
  { id: "preprocess", label: "판매 데이터 정리", description: "날짜와 상품별 판매 흐름을 정리합니다." },
  { id: "importance", label: "예측 준비", description: "내일 판매량 계산에 필요한 정보를 준비합니다." },
  { id: "localTraining", label: "매장 패턴 반영", description: "이 매장의 판매 흐름을 예측에 반영합니다." },
  { id: "centralSync", label: "서버 연결 확인", description: "공동 예측 정보가 준비되어 있는지 확인합니다." },
  { id: "prediction", label: "내일 판매량 계산", description: "같은 파일로 다음 날짜 예상 판매량을 계산합니다." },
  { id: "complete", label: "결과 준비", description: "판매 예측 결과 화면을 준비합니다." },
];

function statusTone(status: TrainingStatus["status"]) {
  if (status === "done") return "success";
  if (status === "running") return "primary";
  if (status === "error") return "warning";
  return "neutral";
}

function statusLabel(status: TrainingStatus["status"]) {
  if (status === "done") return "완료";
  if (status === "running") return "계산 중";
  if (status === "error") return "확인 필요";
  return "대기";
}

function stageIdFromTrainingStatus(status: TrainingStatus): RunStageId {
  if (status.stage === "preprocess") return "preprocess";
  if (status.stage === "importance") return "importance";
  if (status.stage === "local_training") return "localTraining";
  if (status.stage === "central_register" || status.stage === "central_download") return "centralSync";
  if (status.stage === "done") return "prediction";

  if (status.message.includes("전처리")) return "preprocess";
  if (status.message.includes("importance")) return "importance";
  if (status.message.includes("사전학습") || status.message.includes("로컬 학습")) return "localTraining";
  if (status.message.includes("중앙") || status.message.includes("집계")) return "centralSync";
  return "localTraining";
}

function stageLabel(stageId: RunStageId) {
  if (stageId === "upload") return "파일 확인";
  if (stageId === "preprocess") return "판매 데이터 정리";
  if (stageId === "importance") return "예측 준비";
  if (stageId === "localTraining") return "매장 패턴 반영";
  if (stageId === "centralSync") return "서버 연결 확인";
  if (stageId === "prediction") return "내일 판매량 계산";
  return "결과 준비";
}

function errorDescription(stageId: RunStageId) {
  if (stageId === "upload") return "판매 이력 파일을 확인하는 중 오류가 발생했습니다.";
  if (stageId === "preprocess") return "판매 데이터를 정리하는 중 오류가 발생했습니다.";
  if (stageId === "importance") return "예측 준비 중 오류가 발생했습니다.";
  if (stageId === "localTraining") return "매장 판매 패턴을 반영하는 중 오류가 발생했습니다.";
  if (stageId === "centralSync") return "서버 연결을 확인하는 중 오류가 발생했습니다.";
  if (stageId === "prediction") return "내일 판매량을 계산하는 중 오류가 발생했습니다.";
  return "결과 화면을 준비하는 중 오류가 발생했습니다.";
}

function buildRunError(stageId: RunStageId): RunModalError {
  return {
    stageId,
    title: `${stageLabel(stageId)} 중 오류 발생`,
    description: errorDescription(stageId),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function ownerStatusMessage(status: TrainingStatus) {
  if (status.status === "idle") return "판매 이력 파일을 올리면 예측을 시작합니다.";
  if (status.status === "running") return `${stageLabel(stageIdFromTrainingStatus(status))} 중입니다.`;
  if (status.status === "done") return "예측 결과가 준비되었습니다.";
  if (status.latestModelPath) return "서버 확인은 필요하지만, 매장 데이터 기준 예측은 진행할 수 있습니다.";
  return "처리 중 확인이 필요한 문제가 발생했습니다.";
}

type TrainingPageProps = {
  onTrainingComplete: (status: CsvStatus, data: DashboardData) => void;
};

export function TrainingPage({ onTrainingComplete }: TrainingPageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localState, setLocalState] = useState<LocalState | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    status: "idle",
    message: "학습 대기 중",
    latestImportance: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isTrainingAccepted, setIsTrainingAccepted] = useState(false);
  const [hasObservedTrainingRun, setHasObservedTrainingRun] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runStage, setRunStage] = useState<RunStageId>("upload");
  const [runModalError, setRunModalError] = useState<RunModalError | null>(null);
  const [runModalNotice, setRunModalNotice] = useState<string | null>(null);
  const [isRunComplete, setIsRunComplete] = useState(false);

  const pendingFileRef = useRef<File | null>(null);
  const hasPredictedRef = useRef(false);
  const onTrainingCompleteRef = useRef(onTrainingComplete);
  onTrainingCompleteRef.current = onTrainingComplete;
  const serverConnected = Boolean(localState?.centralHealth?.ok);
  const canPredictAfterTraining =
    isTrainingAccepted &&
    hasObservedTrainingRun &&
    !runModalError &&
    !isRunComplete &&
    (trainingStatus.status === "done" || (trainingStatus.status === "error" && Boolean(trainingStatus.latestModelPath)));

  useEffect(() => {
    if (!canPredictAfterTraining) return;
    if (!pendingFileRef.current) return;
    if (hasPredictedRef.current) return;

    hasPredictedRef.current = true;
    const file = pendingFileRef.current;
    setRunStage("prediction");
    setIsPredicting(true);

    analyzeCsvWithAi(file)
      .then(async (result) => {
        setRunStage("complete");
        setIsRunComplete(true);
        await sleep(850);
        onTrainingCompleteRef.current(result.status, result.data);
      })
      .catch((error: unknown) => {
        void error;
        setRunModalError(buildRunError("prediction"));
        setIsPredicting(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPredictAfterTraining]);

  useEffect(() => {
    if (!isTrainingAccepted || !pendingFileRef.current || runModalError || isRunComplete) return;

    if (trainingStatus.status === "running") {
      setHasObservedTrainingRun(true);
      setRunStage(stageIdFromTrainingStatus(trainingStatus));
      return;
    }

    if (!hasObservedTrainingRun) return;

    if (trainingStatus.status === "done") {
      setRunStage("prediction");
      return;
    }

    if (trainingStatus.status === "error") {
      const failedStage = stageIdFromTrainingStatus(trainingStatus);
      if (trainingStatus.latestModelPath) {
        setRunStage("prediction");
        setRunModalNotice(`${stageLabel(failedStage)} 중 문제가 있었습니다. 현재 매장 데이터 기준으로 예측을 계속합니다.`);
        return;
      }
      setRunModalError(buildRunError(failedStage));
    }
  }, [hasObservedTrainingRun, isRunComplete, isTrainingAccepted, runModalError, trainingStatus]);

  const refreshState = async () => {
    const [state, status] = await Promise.all([fetchLocalState(), fetchTrainingStatus()]);
    setLocalState(state);
    setTrainingStatus(status);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [state, status] = await Promise.all([fetchLocalState(), fetchTrainingStatus()]);
        if (!cancelled) {
          setLocalState(state);
          setTrainingStatus(status);
        }
      } catch (error) {
        if (!cancelled) {
          void error;
          if (isTrainingAccepted && pendingFileRef.current) {
            setRunModalError(buildRunError("preprocess"));
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleTrainingFile = async (file: File) => {
    pendingFileRef.current = file;
    hasPredictedRef.current = false;
    setIsTrainingAccepted(false);
    setHasObservedTrainingRun(false);
    setRunModalOpen(true);
    setRunStage("upload");
    setRunModalError(null);
    setRunModalNotice(null);
    setIsRunComplete(false);
    setIsStarting(true);
    try {
      await startTrainingWithAi(file);
      setIsTrainingAccepted(true);
      setRunStage("preprocess");
      await refreshState();
    } catch (error) {
      void error;
      setRunModalError(buildRunError("upload"));
    } finally {
      setIsStarting(false);
    }
  };

  const closeRunModal = () => {
    setRunModalOpen(false);
    setRunModalError(null);
    setRunModalNotice(null);
    setIsTrainingAccepted(false);
    setHasObservedTrainingRun(false);
    pendingFileRef.current = null;
  };

  const modalMode = runModalError ? "error" : isRunComplete ? "success" : "loading";
  const modalTitle = runModalError
    ? runModalError.title
    : isRunComplete
      ? "예측 결과 준비 완료"
      : `${stageLabel(runStage)} 중`;
  const modalDescription = runModalError
    ? runModalError.description
    : isRunComplete
      ? "잠시 후 판매 예측 결과 화면으로 이동합니다."
      : runStage === "prediction"
        ? "업로드한 판매 이력으로 다음 날짜 예상 판매량을 계산하고 있습니다."
        : "판매 데이터를 바탕으로 예측 결과를 준비하고 있습니다.";

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6">
      <RunStatusModal
        open={runModalOpen}
        mode={modalMode}
        title={modalTitle}
        description={modalDescription}
        steps={runSteps}
        activeStepId={runModalError?.stageId ?? runStage}
        notice={runModalNotice}
        onClose={runModalError ? closeRunModal : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>판매 데이터 업로드</CardTitle>
              <CardDescription>CSV 한 번으로 다음 날짜 예상 판매량을 계산합니다.</CardDescription>
            </div>
            <FileUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="rounded-[20px] bg-slate-50 p-5">
            <p className="text-sm leading-6 text-slate-600">
              지금까지의 판매 이력을 올리면 상품별 수요 흐름을 확인하고, 다음 날짜 판매량을 바로 예측합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={isStarting || isPredicting}>
                {isStarting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileUp className="h-4 w-4" aria-hidden="true" />}
                {isStarting ? "파일 확인 중" : "CSV 선택"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void refreshState()} disabled={isLoading || isPredicting}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                상태 새로고침
              </Button>
            </div>
            {isPredicting ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                판매 예측 결과를 준비하는 중입니다.
              </div>
            ) : null}
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleTrainingFile(file);
                  event.currentTarget.value = "";
                }
              }}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>처리 상태</CardTitle>
              <CardDescription>판매 예측 준비가 어디까지 진행됐는지 확인합니다.</CardDescription>
            </div>
            <Activity className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-slate-400">현재 상태</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{ownerStatusMessage(trainingStatus)}</p>
              </div>
              <Badge tone={statusTone(trainingStatus.status)}>{statusLabel(trainingStatus.status)}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">서비스 연결</p>
                <div className="mt-2 flex items-center gap-2">
                  <Wifi className={`h-4 w-4 ${serverConnected ? "text-emerald-600" : "text-amber-600"}`} aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-900">{serverConnected ? "연결됨" : "확인 필요"}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">분석 매장</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{trainingStatus.clientId ?? "파일 업로드 후 확인"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">시작 시각</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{trainingStatus.startedAt ?? "-"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">최근 갱신</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{trainingStatus.updatedAt ?? "-"}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>업로드 후 확인할 수 있는 것</CardTitle>
            <CardDescription>점주가 바로 판단할 수 있는 판매 예측 결과만 정리합니다.</CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              내일 예상 판매량
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">상품별로 다음 날짜에 얼마나 팔릴지 예측합니다.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              최근 판매 흐름
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">최근 실제 판매량과 예측값을 한 그래프에서 비교합니다.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              재고 참고
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">예상 수요를 보고 발주와 재고 확인에 참고할 수 있습니다.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
