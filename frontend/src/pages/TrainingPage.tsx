import { useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Cpu,
  FileUp,
  LoaderCircle,
  Radio,
  RefreshCw,
  TriangleAlert,
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
  { id: "upload", label: "CSV 접수", description: "판매 이력 파일을 로컬 FastAPI에 전달합니다." },
  { id: "preprocess", label: "데이터 전처리", description: "학습에 필요한 날짜, 상품, feature를 준비합니다." },
  { id: "importance", label: "중요도 생성", description: "중앙 클러스터링에 쓸 noisy importance를 만듭니다." },
  { id: "localTraining", label: "로컬 학습", description: "이 클라이언트의 개인 모델과 noisy importance를 생성합니다." },
  { id: "centralSync", label: "중앙 동기화", description: "로컬 모델을 중앙 서버에 보내고 클러스터 모델을 받습니다." },
  { id: "prediction", label: "판매 예측", description: "같은 CSV와 최신 로컬 모델로 다음날 판매량을 계산합니다." },
  { id: "complete", label: "결과 이동", description: "판매 예측 결과 화면을 준비합니다." },
];

function statusTone(status: TrainingStatus["status"]) {
  if (status === "done") return "success";
  if (status === "running") return "primary";
  if (status === "error") return "danger";
  return "neutral";
}

function statusLabel(status: TrainingStatus["status"]) {
  if (status === "done") return "완료";
  if (status === "running") return "진행 중";
  if (status === "error") return "오류";
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
  if (stageId === "upload") return "CSV 접수";
  if (stageId === "preprocess") return "데이터 전처리";
  if (stageId === "importance") return "noisy importance 생성";
  if (stageId === "localTraining") return "로컬 학습";
  if (stageId === "centralSync") return "중앙 서버 동기화";
  if (stageId === "prediction") return "판매 예측 계산";
  return "결과 화면 이동";
}

function errorDescription(stageId: RunStageId) {
  if (stageId === "upload") return "CSV를 로컬 FastAPI에 전달하는 중 오류가 발생했습니다.";
  if (stageId === "preprocess") return "CSV를 학습 가능한 형태로 정리하는 중 오류가 발생했습니다.";
  if (stageId === "importance") return "로컬 feature importance를 생성하는 중 오류가 발생했습니다.";
  if (stageId === "localTraining") return "개인 모델 .pt를 만드는 로컬 학습 중 오류가 발생했습니다.";
  if (stageId === "centralSync") return "중앙 서버에 모델을 등록하거나 클러스터 모델을 받는 중 오류가 발생했습니다.";
  if (stageId === "prediction") return "최신 로컬 모델로 다음날 판매량을 계산하는 중 오류가 발생했습니다.";
  return "결과 화면을 준비하는 중 오류가 발생했습니다.";
}

function buildRunError(stageId: RunStageId): RunModalError {
  return {
    stageId,
    title: `${stageLabel(stageId)}에서 오류 발생`,
    description: errorDescription(stageId),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  const centralHealth = localState?.centralHealth;
  const canPredictAfterTraining =
    isTrainingAccepted &&
    hasObservedTrainingRun &&
    !runModalError &&
    !isRunComplete &&
    (trainingStatus.status === "done" || (trainingStatus.status === "error" && Boolean(trainingStatus.latestModelPath)));

  // Continue to prediction once a local model exists, even if central sync is not ready yet.
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
        setRunModalNotice(`${stageLabel(failedStage)}에서 오류 발생. 로컬 모델로 예측을 계속합니다.`);
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

  const activeImportance = trainingStatus.latestImportance.length
    ? trainingStatus.latestImportance
    : localState?.latestImportance ?? [];
  const modalMode = runModalError ? "error" : isRunComplete ? "success" : "loading";
  const modalTitle = runModalError
    ? runModalError.title
    : isRunComplete
      ? "예측 결과 준비 완료"
      : `${stageLabel(runStage)} 진행 중`;
  const modalDescription = runModalError
    ? runModalError.description
    : isRunComplete
      ? "잠시 후 판매 예측 결과 화면으로 이동합니다."
      : runStage === "prediction"
        ? "업로드한 CSV와 최신 로컬 모델로 2014-10-22 판매량을 예측하고 있습니다."
        : "CSV 한 번으로 로컬 학습부터 다음날 예측까지 순서대로 실행하고 있습니다.";

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
              <CardTitle>CSV 업로드 및 실행</CardTitle>
              <CardDescription>한 번 업로드하면 로컬 학습 후 같은 파일로 다음날 판매량을 예측합니다.</CardDescription>
            </div>
            <FileUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="rounded-[20px] bg-slate-50 p-5">
            <p className="text-sm leading-6 text-slate-600">
              로컬 사전학습은 이 클라이언트 안에서 진행됩니다. 중앙 동기화가 아직 준비되지 않아도 로컬 모델이 만들어지면 바로 예측 결과 화면으로 이동합니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={isStarting || isPredicting}>
                {isStarting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileUp className="h-4 w-4" aria-hidden="true" />}
                {isStarting ? "실행 시작 중" : "CSV 선택"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void refreshState()} disabled={isLoading || isPredicting}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                상태 새로고침
              </Button>
            </div>
            {isPredicting ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                로컬 모델 생성 완료. 같은 CSV로 판매 예측을 계산하는 중입니다…
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
              <CardTitle>학습 상태</CardTitle>
              <CardDescription>현재 로컬 사전학습과 중앙 서버 동기화 상태입니다.</CardDescription>
            </div>
            <Activity className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-slate-400">상태</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{trainingStatus.message}</p>
              </div>
              <Badge tone={statusTone(trainingStatus.status)}>{statusLabel(trainingStatus.status)}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">중앙 백엔드</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">{localState?.centralBackend ?? trainingStatus.centralBackend ?? "-"}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone={centralHealth?.ok ? "success" : centralHealth ? "danger" : "neutral"}>
                    {centralHealth?.ok ? "health 정상" : centralHealth ? "health 실패" : "확인 전"}
                  </Badge>
                  {centralHealth?.statusCode ? (
                    <span className="text-xs font-medium text-slate-400">HTTP {centralHealth.statusCode}</span>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">현재 클라이언트</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{trainingStatus.clientId ?? "-"}</p>
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
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">클러스터 배정</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {trainingStatus.centralSync?.clusterId != null
                  ? `Cluster ${trainingStatus.centralSync.clusterId}`
                  : trainingStatus.centralSync?.assignedTo ?? "-"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>로컬 자산 상태</CardTitle>
              <CardDescription>사전 배포 모델과 로컬 학습 결과물이 어디에 있는지 확인합니다.</CardDescription>
            </div>
            <Cpu className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">사전 배포 모델 수</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{localState?.pretrainedModelCount ?? 0}개</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">로컬 학습 모델 수</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{localState?.localModelCount ?? 0}개</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">중앙 동기화 모델 수</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{localState?.syncedModelCount ?? 0}개</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">최근 로컬 모델 경로</p>
              <p className="mt-1 break-all font-medium text-slate-900">{localState?.latestLocalModelPath ?? trainingStatus.latestModelPath ?? "-"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">최근 동기화 모델 경로</p>
              <p className="mt-1 break-all font-medium text-slate-900">{localState?.latestSyncedModelPath ?? trainingStatus.centralSync?.effectiveModelPath ?? "-"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-400">로컬 noisy importance 경로</p>
              <p className="mt-1 break-all font-medium text-slate-900">{localState?.latestImportancePath ?? trainingStatus.latestImportancePath ?? "-"}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>최근 noisy importance</CardTitle>
              <CardDescription>중앙 클러스터링에 전달할 로컬 feature importance 상위 항목입니다.</CardDescription>
            </div>
            <Radio className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              로컬 상태를 불러오는 중입니다.
            </div>
          ) : activeImportance.length ? (
            <div className="space-y-3">
              {activeImportance.map((item) => (
                <div key={`${item.rank}-${item.feature}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.rank}. {item.feature}</p>
                    <p className="mt-1 text-xs text-slate-400">클러스터 유사도 비교에 사용하는 로컬 privacy-safe 중요도</p>
                  </div>
                  <Badge tone="primary">{item.importance.toFixed(4)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-700">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              아직 생성된 noisy importance가 없습니다. 로컬 학습을 한 번 시작해 주세요.
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-slate-100 bg-white px-4 py-4">
            <p className="text-xs font-medium text-slate-400">선택된 feature 수</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {localState?.selectedFeatures.length ?? 0}개
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(localState?.selectedFeatures ?? []).map((feature) => (
                <Badge key={feature} tone="info">{feature}</Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>이 페이지가 보여주는 것</CardTitle>
            <CardDescription>로컬 앱이 실제로 수행하는 FL 준비 단계를 한 화면에서 점검합니다.</CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              로컬 사전학습
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">업로드한 CSV로 이 매장 로컬 학습을 수행하고, 중앙 집계를 위한 초기 모델을 만듭니다.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              noisy importance 생성
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">로컬 데이터 기반 feature importance를 만들고 DP-noise가 반영된 상위 feature를 저장합니다.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              중앙 연결 상태
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">중앙 백엔드 업로드 결과, 클러스터 배정, 집계 모델 다운로드 상태를 확인합니다.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
