# Fedstock Frontend

Fedstock은 샘플 데이터나 직접 올린 CSV 자료를 바탕으로 일일 판매량, 재고 위험도, 발주 추천 등을 확인할 수 있는 가벼운 매장 운영 대시보드입니다.

기능 설명은 [FEATURES.md](./FEATURES.md)에서 확인할 수 있습니다.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- TanStack Table

## Getting Started

```bash
npm install
npm run dev
```

터미널에 표시되는 Vite 로컬 URL(보통 아래 주소)을 브라우저에서 엽니다:

```bash
http://localhost:5173
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Pages

- `오늘 요약`: 일일 판매 요약 및 판매 흐름 차트
- `자료 올리기`: CSV 업로드 및 유효성 검사
- `재고 점검`: 상품별 재고 상태 테이블
- `발주 추천`: 발주 추천 수량 카드 및 우선순위 테이블

## CSV Format

Required columns:

- `item_id`
- `sale_date`
- `sales`
- `current_stock`
- `sell_price`

Optional columns:

- `category`
- `lead_time_days`
- `ordered_qty`
- `on_order_qty`
- `safety_stock`
- `reorder_point`
- `recommended_order_qty`

선택 항목이 파일에 없는 경우, 앱이 가지고 있는 판매량과 재고 데이터를 바탕으로 적절한 값을 자동으로 계산해서 화면에 보여줍니다.

## Project Structure

```text
src/
  components/
    dashboard/   대시보드 전용 카드, 테이블, 배지, 차트
    layout/      전체 셸, 상단 고정 헤더, 사이드바
    ui/          shared UI primitives
  lib/           mock data, CSV processing, utility functions
  pages/         각 탭별 최상위 화면 페이지
  types/         전역에서 사용하는 타입 정의
```

## Build

```bash
npm run build
```

실제 배포용 프로덕션 빌드 파일은 dist/ 폴더에 생성됩니다.
