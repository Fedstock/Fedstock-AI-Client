## 결과물 사용 방법

### `data/processed/features.csv`

- 로컬 수요 예측 모델 학습에 사용
- LSTM, XGBoost, PA-CFL 모델 입력 데이터로 활용
- 포함 정보
  - 날짜 feature
  - 가격 feature
  - lag feature
    - 7일 전 판매량
    - 14일 전 판매량
    - 28일 전 판매량
  - rolling feature
    - 직전 7일 평균 판매량
    - 직전 28일 평균 판매량
    - 직전 7일 / 28일 판매량 표준편차
  - `client_id`

---

### `data/processed/inventory.csv`

- M5 원본 데이터에 없는 재고 관련 데이터를 합성한 파일
- 수요 예측 모델 학습용이 아니라, 수요 예측 결과 이후 재고 추천 계산에 사용
- 포함 정보
  - 현재 재고량
  - 리드타임
  - 목표 서비스 수준
  - 안전재고
  - 발주점
  - 추천 발주량

---

### `data/processed/sales_long.csv`

- M5 원본 판매 데이터를 wide format에서 long format으로 변환한 중간 결과
- 데이터 변환이 제대로 되었는지 확인하는 용도
- 모델 학습에는 보통 `features.csv`를 사용

---

### `data/server/stores.csv`

- 서버에서 client 목록을 관리하기 위한 메타데이터 파일
- client registry 역할
- 포함 정보
  - `client_id`
  - `store_id`
  - `state_id`
  - `dept_id`
  - client 상태 정보

---

### `data/clients/client_{client_id}.db`

- 각 client가 로컬에서 사용하는 SQLite DB 파일
- client별 로컬 학습 시 사용
- 포함 테이블
  - `SALES_RECORDS`
    - 해당 client의 판매 기록
  - `FEATURES`
    - 모델 학습용 feature
  - `INVENTORY`
    - 재고 추천 및 추천 발주량 정보

---

## Client 구성 방식

현재 프로젝트에서는 `store_id + dept_id` 기준으로 client를 구성

```text
client_id = store_id + "_" + dept_id

