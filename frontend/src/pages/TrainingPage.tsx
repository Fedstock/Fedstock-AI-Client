import { useCallback, useEffect, useRef, useState } from "react";
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
import { analyzeCsvWithAi, fetchLocalState, fetchTrainingStatus, startTrainingWithAi, syncFlModelWithAi } from "../lib/ai-api";
import type { CsvStatus, DashboardData, LocalState, TrainingStatus } from "../types/dashboard";

type RunStageId = "preprocess" | "importance" | "localTraining" | "centralSync" | "prediction" | "complete";
type SyncStageId = "prepare" | "history" | "nearby" | "recalculate" | "apply" | "complete";

type RunModalError = {
  stageId: RunStageId;
  title: string;
  description: string;
};

type SyncModalError = {
  stageId: SyncStageId;
  title: string;
  description: string;
};

type AiUpdateSummary = {
  completedAt: string;
  modelVersion?: string;
  savedCsvCount?: number;
  updatedStoreCount?: number;
  neighborhoodSalesDays?: number;
};

const runSteps: RunStatusStep[] = [
  { id: "preprocess", label: "CSV 확인 및 정리", description: "올린 파일과 상품별 판매 흐름을 함께 정리합니다." },
  { id: "importance", label: "예측 준비", description: "내일 판매량 계산에 필요한 정보를 준비합니다." },
  { id: "localTraining", label: "매장 패턴 반영", description: "이 매장의 판매 흐름을 예측에 반영합니다." },
  { id: "centralSync", label: "서버 연결 확인", description: "공동 예측 정보가 준비되어 있는지 확인합니다." },
  { id: "prediction", label: "내일 판매량 계산", description: "같은 파일로 다음 날짜 예상 판매량을 계산합니다." },
  { id: "complete", label: "결과 준비", description: "판매 예측 결과 화면을 준비합니다." },
];

const syncSteps: RunStatusStep[] = [
  { id: "prepare", label: "업데이트 준비", description: "Fedstock AI 업데이트를 시작합니다." },
  { id: "history", label: "판매 이력 확인", description: "이 매장의 누적 판매 데이터를 확인합니다." },
  { id: "nearby", label: "상권 흐름 반영", description: "주변 상권의 하루 판매 흐름을 함께 봅니다." },
  { id: "recalculate", label: "AI 재계산", description: "매장별 패턴을 합쳐 AI 가중치를 다시 계산합니다." },
  { id: "apply", label: "매장 적용", description: "업데이트된 AI를 이 매장 예측에 적용합니다." },
  { id: "complete", label: "업데이트 완료", description: "새로운 예측 기준을 저장합니다." },
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
  if (
    status.stage === "central_register" ||
    status.stage === "central_download" ||
    status.stage === "central_cluster_assignment" ||
    status.stage === "central_fl_model_sync" ||
    status.stage === "cluster_model_download"
  ) {
    return "centralSync";
  }
  if (status.stage === "sync_load") return "preprocess";
  if (status.stage === "done") return "prediction";

  if (status.message.includes("전처리")) return "preprocess";
  if (status.message.includes("importance")) return "importance";
  if (status.message.includes("사전학습") || status.message.includes("로컬 학습")) return "localTraining";
  if (status.message.includes("중앙") || status.message.includes("집계")) return "centralSync";
  return "localTraining";
}

function stageLabel(stageId: RunStageId) {
  if (stageId === "preprocess") return "CSV 확인 및 정리";
  if (stageId === "importance") return "예측 준비";
  if (stageId === "localTraining") return "매장 패턴 반영";
  if (stageId === "centralSync") return "서버 연결 확인";
  if (stageId === "prediction") return "내일 판매량 계산";
  return "결과 준비";
}

function syncStageIdFromTrainingStatus(status: TrainingStatus): SyncStageId {
  if (status.stage === "sync_prepare") return "prepare";
  if (status.stage === "sync_load") return "history";
  if (status.stage === "sync_neighbor_sales") return "nearby";
  if (status.stage === "central_fl_model_sync") return "recalculate";
  if (status.stage === "sync_apply_model") return "apply";
  if (status.stage === "done") return "complete";

  if (status.message.includes("주변 상권")) return "nearby";
  if (status.message.includes("가중치") || status.message.includes("다시 계산")) return "recalculate";
  if (status.message.includes("적용")) return "apply";
  if (status.message.includes("판매 이력")) return "history";
  return "prepare";
}

function syncStageLabel(stageId: SyncStageId) {
  if (stageId === "prepare") return "업데이트 준비";
  if (stageId === "history") return "판매 이력 확인";
  if (stageId === "nearby") return "상권 흐름 반영";
  if (stageId === "recalculate") return "AI 재계산";
  if (stageId === "apply") return "매장 적용";
  return "업데이트 완료";
}

function errorDescription(stageId: RunStageId) {
  if (stageId === "preprocess") return "판매 이력 파일과 데이터를 정리하는 중 오류가 발생했습니다.";
  if (stageId === "importance") return "예측 준비 중 오류가 발생했습니다.";
  if (stageId === "localTraining") return "매장 판매 패턴을 반영하는 중 오류가 발생했습니다.";
  if (stageId === "centralSync") return "서버 연결을 확인하는 중 오류가 발생했습니다.";
  if (stageId === "prediction") return "내일 판매량을 계산하는 중 오류가 발생했습니다.";
  return "결과 화면을 준비하는 중 오류가 발생했습니다.";
}

function buildSyncError(stageId: SyncStageId): SyncModalError {
  return {
    stageId,
    title: `${syncStageLabel(stageId)} 중 오류 발생`,
    description: "Fedstock AI 업데이트 중 확인이 필요한 문제가 발생했습니다.",
  };
}

function buildAiUpdateSummary(status: TrainingStatus): AiUpdateSummary {
  return {
    completedAt: status.centralSync?.completedAt ?? status.updatedAt ?? new Date().toLocaleString("ko-KR"),
    modelVersion: status.centralSync?.modelVersion,
    savedCsvCount: status.centralSync?.savedCsvCount,
    updatedStoreCount: status.centralSync?.updatedStoreCount,
    neighborhoodSalesDays: status.centralSync?.neighborhoodSalesDays,
  };
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
  if (status.centralSync?.scope === "federated_sync" && status.status === "running") {
    return `Fedstock AI ${syncStageLabel(syncStageIdFromTrainingStatus(status))} 중입니다.`;
  }
  if (status.centralSync?.scope === "federated_sync" && status.status === "done") {
    return "Fedstock AI 업데이트가 완료되었습니다.";
  }
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
  const [isSyncingFlModel, setIsSyncingFlModel] = useState(false);
  const [isTrainingAccepted, setIsTrainingAccepted] = useState(false);
  const [hasObservedTrainingRun, setHasObservedTrainingRun] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runStage, setRunStage] = useState<RunStageId>("preprocess");
  const [runModalError, setRunModalError] = useState<RunModalError | null>(null);
  const [runModalNotice, setRunModalNotice] = useState<string | null>(null);
  const [isRunComplete, setIsRunComplete] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncStage, setSyncStage] = useState<SyncStageId>("prepare");
  const [syncModalError, setSyncModalError] = useState<SyncModalError | null>(null);
  const [isSyncComplete, setIsSyncComplete] = useState(false);
  const [hasObservedSyncRun, setHasObservedSyncRun] = useState(false);
  const [lastAiUpdate, setLastAiUpdate] = useState<AiUpdateSummary | null>(null);

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
    const predictionStartedAt = Date.now();
    setRunStage("prediction");
    setIsPredicting(true);

    analyzeCsvWithAi(file)
      .then(async (result) => {
        const elapsed = Date.now() - predictionStartedAt;
        if (elapsed < 2400) {
          await sleep(2400 - elapsed);
        }
        setRunStage("complete");
        setIsRunComplete(true);
        await sleep(1200);
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

  const refreshState = useCallback(async () => {
    const [state, status] = await Promise.all([fetchLocalState(), fetchTrainingStatus()]);
    setLocalState(state);
    setTrainingStatus(status);
  }, []);

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

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isTrainingAccepted || !pendingFileRef.current || runModalError || isRunComplete) return;
    if (trainingStatus.status === "done" || trainingStatus.status === "error") return;

    let cancelled = false;
    const poll = async () => {
      try {
        await refreshState();
      } catch (error) {
        if (!cancelled) {
          void error;
          setRunModalError(buildRunError("preprocess"));
        }
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRunComplete, isTrainingAccepted, refreshState, runModalError, trainingStatus.status]);

  useEffect(() => {
    if (!isSyncingFlModel || syncModalError || isSyncComplete) return;

    if (trainingStatus.status === "running") {
      setHasObservedSyncRun(true);
      setSyncStage(syncStageIdFromTrainingStatus(trainingStatus));
    } else if (hasObservedSyncRun && trainingStatus.status === "done") {
      setSyncStage("complete");
      setIsSyncComplete(true);
      setIsSyncingFlModel(false);
      const summary = buildAiUpdateSummary(trainingStatus);
      setLastAiUpdate(summary);
      setSyncNotice("Fedstock AI 업데이트가 완료되었습니다.");
      return;
    } else if (hasObservedSyncRun && trainingStatus.status === "error") {
      const failedStage = syncStageIdFromTrainingStatus(trainingStatus);
      setIsSyncingFlModel(false);
      setSyncModalError(buildSyncError(failedStage));
      setSyncError(trainingStatus.message || "Fedstock AI 업데이트 중 오류가 발생했습니다.");
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(() => {
      refreshState().catch((error: unknown) => {
        if (!cancelled) {
          void error;
          setIsSyncingFlModel(false);
          setSyncModalError(buildSyncError(syncStage));
          setSyncError("Fedstock AI 업데이트 상태를 확인하지 못했습니다.");
        }
      });
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hasObservedSyncRun, isSyncComplete, isSyncingFlModel, refreshState, syncModalError, syncStage, trainingStatus]);

  const handleTrainingFile = async (file: File) => {
    pendingFileRef.current = file;
    hasPredictedRef.current = false;
    setIsTrainingAccepted(false);
    setHasObservedTrainingRun(false);
    setRunModalOpen(true);
    setRunStage("preprocess");
    setRunModalError(null);
    setRunModalNotice(null);
    setIsRunComplete(false);
    setIsStarting(true);
    try {
      await sleep(700);
      await startTrainingWithAi(file);
      setIsTrainingAccepted(true);
      setHasObservedTrainingRun(true);
      setRunStage("preprocess");
      setTrainingStatus((current) => ({
        ...current,
        status: "running",
        stage: "preprocess",
        message: "데이터 전처리 중...",
        latestImportance: current.latestImportance ?? [],
      }));
      await refreshState();
    } catch (error) {
      void error;
      setRunModalError(buildRunError("preprocess"));
    } finally {
      setIsStarting(false);
    }
  };

  const handleSyncFlModel = async () => {
    setSyncNotice(null);
    setSyncError(null);
    setSyncModalOpen(true);
    setSyncStage("prepare");
    setSyncModalError(null);
    setIsSyncComplete(false);
    setHasObservedSyncRun(false);
    setIsSyncingFlModel(true);
    try {
      const result = await syncFlModelWithAi();
      setHasObservedSyncRun(true);
      setTrainingStatus((current) => ({
        ...current,
        status: "running",
        stage: "sync_prepare",
        message: result.message ?? "Fedstock AI 업데이트를 시작했습니다.",
        latestImportance: current.latestImportance ?? [],
      }));
    } catch (error) {
      setIsSyncingFlModel(false);
      setSyncModalError(buildSyncError("prepare"));
      setSyncError(error instanceof Error ? error.message : "Fedstock AI 업데이트를 시작하지 못했습니다.");
    }
  };

  const closeSyncModal = () => {
    setSyncModalOpen(false);
    setSyncModalError(null);
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
  const syncModalMode = syncModalError ? "error" : isSyncComplete ? "success" : "loading";
  const syncModalTitle = syncModalError
    ? syncModalError.title
    : isSyncComplete
      ? "Fedstock AI 업데이트 완료"
      : `${syncStageLabel(syncStage)} 중`;
  const syncModalDescription = syncModalError
    ? syncModalError.description
    : isSyncComplete
      ? "주변 상권의 하루 판매 흐름을 반영한 AI가 이 매장 예측에 적용되었습니다."
      : syncStage === "nearby"
        ? "주변 상권의 하루 판매량을 참고해 우리 매장의 예측 기준을 다듬고 있습니다."
        : syncStage === "recalculate"
          ? "매장별 판매 패턴을 합쳐 Fedstock AI의 글로벌 예측 기준을 다시 계산하고 있습니다."
          : "Fedstock의 AI를 업데이트 중입니다. 잠시만 기다려 주세요.";
  return (
    <div className="w-full space-y-6">
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
      <RunStatusModal
        open={syncModalOpen}
        mode={syncModalMode}
        title={syncModalTitle}
        description={syncModalDescription}
        steps={syncSteps}
        activeStepId={syncModalError?.stageId ?? syncStage}
        onClose={syncModalError || isSyncComplete ? closeSyncModal : undefined}
      />

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex h-full flex-col gap-6">
          <Card className="h-fit p-7">
            <CardHeader>
              <div>
                <CardTitle>판매 데이터 업로드</CardTitle>
                <CardDescription>CSV 한 번으로 다음 날짜 예상 판매량을 계산합니다.</CardDescription>
              </div>
              <FileUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </CardHeader>
            <div className="rounded-[22px] bg-slate-50 p-6">
              <p className="text-sm leading-6 text-slate-600">
                지금까지의 판매 이력을 올리면 상품별 수요 흐름을 확인하고, 다음 날짜 판매량을 바로 예측합니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="h-12 px-5 text-base" type="button" onClick={() => inputRef.current?.click()} disabled={isStarting || isPredicting || isSyncingFlModel}>
                  {isStarting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileUp className="h-4 w-4" aria-hidden="true" />}
                  {isStarting ? "파일 확인 중" : "CSV 선택"}
                </Button>
                <Button className="h-12 px-5 text-base" type="button" variant="outline" onClick={() => void handleSyncFlModel()} disabled={isLoading || isStarting || isPredicting || isSyncingFlModel || trainingStatus.status === "running"}>
                  {isSyncingFlModel ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  {isSyncingFlModel ? "AI 업데이트 중" : "Fedstock AI 업데이트"}
                </Button>
                <Button className="h-12 px-5 text-base" type="button" variant="outline" onClick={() => void refreshState()} disabled={isLoading || isPredicting || isSyncingFlModel}>
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
              {syncNotice ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {syncNotice}
                </div>
              ) : null}
              {lastAiUpdate ? (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(16,185,129,0.08)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-950">Fedstock AI 업데이트 완료</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {lastAiUpdate.completedAt}
                        {lastAiUpdate.modelVersion ? ` · ${lastAiUpdate.modelVersion}` : ""}
                      </p>
                      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                        <span className="rounded-xl bg-slate-50 px-3 py-2">누적 CSV {lastAiUpdate.savedCsvCount ?? 0}개</span>
                        <span className="rounded-xl bg-slate-50 px-3 py-2">반영 매장 {lastAiUpdate.updatedStoreCount ?? 70}개</span>
                        <span className="rounded-xl bg-slate-50 px-3 py-2">최근 {lastAiUpdate.neighborhoodSalesDays ?? 28}일 흐름</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {syncError ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  {syncError}
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

          <Card className="flex flex-1 flex-col p-7">
            <CardHeader>
              <div>
                <CardTitle>업로드 후 확인할 수 있는 것</CardTitle>
                <CardDescription>점주가 바로 판단할 수 있는 판매 예측 결과만 정리합니다.</CardDescription>
              </div>
            </CardHeader>
            <div className="grid flex-1 gap-4 lg:grid-cols-3">
              <div className="flex min-h-[118px] flex-col justify-center rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  내일 예상 판매량
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">상품별로 다음 날짜에 얼마나 팔릴지 예측합니다.</p>
              </div>
              <div className="flex min-h-[118px] flex-col justify-center rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  최근 판매 흐름
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">최근 실제 판매량과 예측값을 한 그래프에서 비교합니다.</p>
              </div>
              <div className="flex min-h-[118px] flex-col justify-center rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  판매 흐름 참고
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">예상 수요와 최근 판매 흐름을 함께 확인할 수 있습니다.</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="flex h-full flex-col p-7">
          <CardHeader>
            <div>
              <CardTitle>처리 상태</CardTitle>
              <CardDescription>판매 예측 준비가 어디까지 진행됐는지 확인합니다.</CardDescription>
            </div>
            <Activity className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-slate-400">현재 상태</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{ownerStatusMessage(trainingStatus)}</p>
              </div>
              <Badge tone={statusTone(trainingStatus.status)}>{statusLabel(trainingStatus.status)}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="min-h-[94px] rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">서비스 연결</p>
                <div className="mt-2 flex items-center gap-2">
                  <Wifi className={`h-4 w-4 ${serverConnected ? "text-emerald-600" : "text-amber-600"}`} aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-900">{serverConnected ? "연결됨" : "확인 필요"}</p>
                </div>
              </div>
              <div className="min-h-[94px] rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">분석 매장</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{trainingStatus.clientId ?? "파일 업로드 후 확인"}</p>
              </div>
              <div className="min-h-[94px] rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">시작 시각</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{trainingStatus.startedAt ?? "-"}</p>
              </div>
              <div className="min-h-[94px] rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">최근 갱신</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{trainingStatus.updatedAt ?? "-"}</p>
              </div>
            </div>
            <div className="mt-auto rounded-[22px] border border-blue-100 bg-blue-50/70 p-5">
              <p className="text-xs font-semibold text-blue-500">다음 단계</p>
              <p className="mt-2 text-sm font-bold text-slate-950">CSV 선택 후 예측 결과 화면으로 이동합니다.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                결과 화면에서 상품별 예상 판매량, 예상 매출, 판매 흐름 항목을 바로 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
