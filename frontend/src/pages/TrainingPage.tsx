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
import { analyzeCsvWithAi, fetchLocalState, fetchTrainingStatus, startTrainingWithAi } from "../lib/ai-api";
import type { CsvStatus, DashboardData, LocalState, TrainingStatus } from "../types/dashboard";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pendingFileRef = useRef<File | null>(null);
  const hasPredictedRef = useRef(false);
  const onTrainingCompleteRef = useRef(onTrainingComplete);
  onTrainingCompleteRef.current = onTrainingComplete;

  // Auto-predict when training transitions to "done" and a pending file exists
  useEffect(() => {
    if (trainingStatus.status !== "done") return;
    if (!pendingFileRef.current) return;
    if (hasPredictedRef.current) return;

    hasPredictedRef.current = true;
    const file = pendingFileRef.current;
    setIsPredicting(true);
    setErrorMessage(null);

    analyzeCsvWithAi(file)
      .then((result) => {
        onTrainingCompleteRef.current(result.status, result.data);
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "예측에 실패했습니다. 판매 예측 탭에서 직접 파일을 올려주세요.");
        setIsPredicting(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingStatus.status]);

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
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "로컬 상태를 불러오지 못했습니다.");
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
    setIsStarting(true);
    setErrorMessage(null);
    try {
      await startTrainingWithAi(file);
      await refreshState();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "로컬 학습을 시작하지 못했습니다.");
    } finally {
      setIsStarting(false);
    }
  };

  const activeImportance = trainingStatus.latestImportance.length
    ? trainingStatus.latestImportance
    : localState?.latestImportance ?? [];

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>로컬 학습 실행</CardTitle>
              <CardDescription>CSV를 업로드하면 이 매장의 로컬 사전학습과 중앙 서버 동기화를 시작합니다.</CardDescription>
            </div>
            <FileUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="rounded-[20px] bg-slate-50 p-5">
            <p className="text-sm leading-6 text-slate-600">
              로컬 사전학습은 이 클라이언트 안에서 진행되고, 이후 noisy feature importance와 로컬 모델이 중앙으로 전송되어 집계 모델을 다시 받아옵니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={isStarting || isPredicting}>
                {isStarting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileUp className="h-4 w-4" aria-hidden="true" />}
                {isStarting ? "학습 시작 중" : "학습용 CSV 선택"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void refreshState()} disabled={isLoading || isPredicting}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                상태 새로고침
              </Button>
            </div>
            {isPredicting ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                학습 완료. 최신 모델로 판매 예측을 계산하는 중입니다…
              </div>
            ) : errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
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
