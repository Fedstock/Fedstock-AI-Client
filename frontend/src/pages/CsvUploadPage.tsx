import { useRef, useState, type DragEvent } from "react";
import { AlertTriangle, CheckCircle, Database, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import type { CsvStatus, DashboardData, ValidationItem } from "../types/dashboard";
import { analyzeCsvWithAi } from "../lib/ai-api";
import { formatNumber } from "../lib/utils";

type CsvUploadPageProps = {
  csvStatus: CsvStatus;
  onCsvLoaded: (status: CsvStatus, data: DashboardData) => void;
};

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

export function CsvUploadPage({ csvStatus, onCsvLoaded }: CsvUploadPageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const result = await analyzeCsvWithAi(file);
      onCsvLoaded(result.status, result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 서버 분석에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6">
      <div className="grid auto-rows-min gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <Card
          className={`border-dashed p-6 transition ${isDragging ? "border-[#2563EB] bg-[#EFF6FF]" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center rounded-[16px] bg-slate-50 px-6 py-10 text-center">
            <div className="mb-4 rounded-3xl bg-white p-4 text-[#2563EB] shadow-sm">
              <Upload className="h-8 w-8" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827]">AI로 분석할 판매·재고 파일을 올려주세요</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6B7280]">
              CSV는 로컬 AI 서버로 전송되고, PA-CFL LSTM 모델이 만든 결과만 화면에 반영됩니다.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={isAnalyzing}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                {isAnalyzing ? "AI 분석 중" : "파일 선택"}
              </Button>
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isAnalyzing}>
                파일 바꾸기
              </Button>
            </div>
            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                if (file) void handleFile(file);
              }}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>파일 요약</CardTitle>
              <CardDescription>업로드 후 데이터 범위를 확인합니다.</CardDescription>
            </div>
            <Database className="h-5 w-5 text-[#6B7280]" aria-hidden="true" />
          </CardHeader>
          {csvStatus.state === "empty" ? (
            <EmptyState icon={FileSpreadsheet} title="아직 올린 파일이 없습니다" description="파일을 올리면 자료 개수, 상품 수, 기간이 표시됩니다." />
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
              <CardDescription>예상 판매와 재고 계산에 필요한 항목을 확인합니다.</CardDescription>
            </div>
          </CardHeader>
          {csvStatus.validation.length ? (
            <div>
              {csvStatus.validation.map((item) => (
                <ValidationRow key={item.column} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState icon={CheckCircle} title="확인 대기 중" description="파일을 올리면 필요한 항목이 들어 있는지 확인합니다." />
          )}
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>오류 및 경고</CardTitle>
              <CardDescription>업로드 품질을 빠르게 점검합니다.</CardDescription>
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
    </div>
  );
}
