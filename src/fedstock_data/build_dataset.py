# main 실행용
# 새로 만들어진 데이터들은 processed에서 확인 가능

from pathlib import Path

from data.load_m5 import load_m5
from data.transform_sales import (
    melt_sales_data,
    merge_calendar,
    create_client_id,
)
from data.feature_engineer import (
    FEATURE_COLS,
    add_calendar_features,
    merge_price_features,
    add_time_series_features, 
    add_targets,
    drop_feature_na,
    filter_clients_by_min_rows,
    cap_rows_per_client,
    add_time_split,
)
from data.inventory_generation import (
    generate_inventory,
    generate_order_recommendations,
)
from data.db_writer import save_clients_to_sqlite
from data.server_table_builder import (
    build_stores_table,
    save_server_tables,
)

def filter_top_items_by_store_dept(sales, top_n=5):
    day_cols = [col for col in sales.columns if col.startswith("d_")]

    sales = sales.copy()
    sales["total_sales"] = sales[day_cols].sum(axis=1)

    filtered = (
        sales.sort_values(["store_id", "dept_id", "total_sales"], ascending=[True, True, False])
        .groupby(["store_id", "dept_id"])
        .head(top_n)
        .drop(columns=["total_sales"])
    )

    return filtered


def main():
    # 1. 저장 폴더 생성
    print("1. 폴더 생성 시작")
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    Path("data/server").mkdir(parents=True, exist_ok=True)
    Path("data/clients").mkdir(parents=True, exist_ok=True)

    # 2. M5 원본 CSV 로드
    print("2. M5 원본 CSV 로드 시작")
    sales, calendar, prices = load_m5("data/raw")
    print("original sales:", sales.shape)
    
    sales = filter_top_items_by_store_dept(sales, top_n=10)
    print("filtered sales:", sales.shape)

    print("calendar:", calendar.shape)
    print("prices:", prices.shape)

    # 테스트용: 전체 데이터 중 일부만 사용
    # sales = sales.head(1000)
    # sales = sales[sales["store_id"].isin(["CA_1", "TX_1", "WI_1"])]
    print("테스트용 sales:", sales.shape) # 전체 데이터셋 실행 (이것만 있으면 됨)

    # 3. wide → long 변환
    print("3. wide → long 변환 시작")
    sales_long = melt_sales_data(sales)
    print("sales_long:", sales_long.shape)

    # 4. 날짜 정보 조인
    print("4. calendar 조인 시작")
    sales_long = merge_calendar(sales_long, calendar)
    print("after calendar merge:", sales_long.shape)

    # 5. client_id 생성
    print("5. client_id 생성 시작")
    sales_long = create_client_id(sales_long, mode="store_dept")
    print("client count:", sales_long["client_id"].nunique())

    # 6.  날짜 / 가격 / 시계열 피처 생성
    print("6. SNAP제외 / 날짜 피처 생성 시작")
    # sales_long = add_snap_flag(sales_long)
    sales_long = add_calendar_features(sales_long)

    print("7. 가격 정보 조인 시작")
    sales_long = merge_price_features(sales_long, prices)
    print("after price merge:", sales_long.shape)

    print("8. lag / rolling 피처 생성 시작")
    sales_long = add_time_series_features(sales_long)

    print("9. target 생성 시작")
    sales_long = add_targets(sales_long)

    print("10. 결측치 제거 시작")
    dataset = drop_feature_na(sales_long)
    print("dataset:", dataset.shape)

    # client가 너무 많이 제거될 시 300, 거의 제거되지 않으면 1000으로 조정가능
    print("11. client별 최소 row 수 필터링 시작")
    dataset = filter_clients_by_min_rows(dataset, min_rows=1)
    print("after client filtering:", dataset.shape)

    print("12. client별 최대 row 수 제한 시작")
    dataset = cap_rows_per_client(dataset, max_rows=20000)
    print("after row capping:", dataset.shape)

    print("13. train / valid / test split 생성 시작")
    dataset = add_time_split(dataset)
    print(dataset["split"].value_counts())

    print("14. 재고 데이터 생성 시작")
    inventory = generate_inventory(dataset)
    inventory = generate_order_recommendations(inventory)
    print("inventory:", inventory.shape)

    print("15. 서버 stores 테이블 생성 시작")
    stores = build_stores_table(dataset)
    print("stores:", stores.shape)

    # 16. 중간 결과 CSV 저장
    print("16. CSV 저장 시작")
    sales_long.to_csv("data/processed/sales_long.csv", index=False)
    dataset.to_csv("data/processed/features.csv", index=False)
    inventory.to_csv("data/processed/inventory.csv", index=False)
    stores.to_csv("data/server/stores.csv", index=False)

    # 17. 클라이언트별 SQLite 저장
    print("17. 클라이언트 SQLite 저장 시작")
    save_clients_to_sqlite(dataset, inventory, output_dir="data/clients")

    print("Dataset build complete.")


if __name__ == "__main__":
    main()