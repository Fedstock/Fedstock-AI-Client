# Fedstock Client (Local POS Agent & UI)

이 디렉토리는 소매점 매장(POS 환경)에서 동작하는 클라이언트 측 시스템 모듈을 포함하고 있습니다. 로컬 데이터 관리, 피처 중요도 추출 및 Laplace 노이즈 주입(차등정보보호), 로컬 LSTM 학습 기능과 함께 점주가 수요 예측 및 발주량을 확인하는 대시보드 UI를 제공합니다.

## 📂 디렉토리 구조 (Directory Structure)

```text
client/
├── app/             # 로컬 POS용 FastAPI 백엔드 (CSV 분석 및 로컬 추론 API)
├── frontend/        # Vite + React 기반의 점주용 대시보드 UI
├── outputs/         # 로컬 모델 가중치 및 예측 결과가 저장되는 리소드 폴더
└── src/             # 클라이언트 측 핵심 파이썬 소스코드
    ├── fl/
    │   ├── client.py           # Flower NumPyClient 기반 로컬 학습 모듈
    │   ├── privacy.py          # XGBoost 피처 중요도 및 라플라스 DP 노이즈 처리
    │   └── extract_features.py # 피처 중요도 추출 실행 스크립트
    ├── models/
    │   └── lstm.py             # 시계열 예측용 Lightweight LSTM 모델 정의 (공유)
    ├── fedstock_data/          # M5 데이터 전처리 및 SQLite 로컬 DB 구축 스크립트
    ├── dataset.py              # 로컬 SQLite 로딩 및 PyTorch DataLoader 빌더
    └── losses.py               # 학습용 HuberSMAPELoss 정의
```

## 🚀 구동 방법 (Quick Start)

### 1. 로컬 POS FastAPI 백엔드 실행
로컬 POS 백엔드는 점주가 CSV 형식의 판매 데이터를 업로드하면 로컬 LSTM 모델을 통해 실시간 예측 및 안전재고 계산 결과를 UI에 반환하는 역할을 수행합니다.

```bash
# client 디렉토리로 이동
cd client

# FastAPI 개발 서버 실행 (Working directory는 반드시 client로 설정)
uvicorn app.main:app --reload --port 8000
```
- API Health Check: `http://localhost:8000/health`
- CSV 분석 엔드포인트: `http://localhost:8000/analyze-csv`

### 2. 점주용 대시보드 UI (Frontend) 실행
Vite 기반의 React 대시보드 애플리케이션으로, 점주가 오늘 요약, 재고 점검, 발주 추천 등을 직관적으로 볼 수 있게 지원합니다.

```bash
# frontend 디렉토리로 이동
cd client/frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```
- 브라우저 접속: `http://localhost:5173` 또는 `http://localhost:5174` (FastAPI 백엔드가 8000 포트에서 구동되는지 확인 요망)

---

## 🔒 프라이버시 원칙 (Privacy Principles)
- 매장의 원본 판매 데이터(`SALES_RECORDS`, `FEATURES`)는 클라이언트 로컬 외부로 절대 전송되지 않습니다.
- 연합학습 서버로는 **라플라스 차등 정보 보호(DP) 노이즈**가 섞인 피처 중요도 벡터(`noisy_vector`)와 학습 완료된 **LSTM 가중치 파일**만 업로드되어 안전하게 보호됩니다.
