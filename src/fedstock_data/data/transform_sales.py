import pandas as pd


# 02 transform_sales.py
"""
M5 원본 데이터를 FedStock에 맞는 데이터 형식으로 가공
1. wide -> long 변환
2. 날짜 정보 조인
3. 클라이언트 ID 생성 (데이터에 있는 내용을 조합해서 식별자 ID 가공)
"""


def melt_sales_data(sales: pd.DataFrame) -> pd.DataFrame:
    id_cols = ["id", "item_id", "dept_id", "cat_id", "store_id", "state_id"]
    day_cols = [col for col in sales.columns if col.startswith("d_")]

    sales_long = sales.melt(
        id_vars=id_cols,
        value_vars=day_cols,
        var_name="d",
        value_name="sales"
    )

    return sales_long


def merge_calendar(sales_long: pd.DataFrame, calendar: pd.DataFrame) -> pd.DataFrame:
    calendar_cols = [
        "d", "date", "wm_yr_wk", "wday", "month", "year",
        "event_name_1", "event_name_2", "event_type_1", "event_type_2"
    ]

    sales_long = sales_long.merge(
        calendar[calendar_cols],
        on="d",
        how="left"
    )

    sales_long["sale_date"] = pd.to_datetime(sales_long["date"])

    return sales_long


def create_client_id(
    sales_long: pd.DataFrame,
    mode: str = "store"
) -> pd.DataFrame:
    """
    mode='store'      → 10개 클라이언트
    mode='store_dept' → 최대 70개 클라이언트
    """

    if mode == "store":
        sales_long["client_id"] = sales_long["store_id"]
    elif mode == "store_dept":
        sales_long["client_id"] = sales_long["store_id"] + "_" + sales_long["dept_id"]
    else:
        raise ValueError("mode must be 'store' or 'store_dept'")

    return sales_long