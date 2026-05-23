import pandas as pd


# 03 feature engineer
"""
모델 학습에 필요한 피처 생성 코드
1.SNAP flag(생성)
2. 이벤트/요일 생성
3. 가격 정보 조인
4. lag/rolling 피처 생성
5. 결측치 제거
"""

# sell_price는 optional
FEATURE_COLS = [
    "lag_7", "lag_14", "lag_28",
    "rolling_mean_7", "rolling_mean_28",
    "rolling_std_7", "rolling_std_28",
    "is_weekend", "is_holiday",
    "price_change_rate", "sell_price",
    "week_of_year", "is_month_start", "is_month_end"
]


# def add_snap_flag(df: pd.DataFrame) -> pd.DataFrame:
#     def get_snap_flag(row):
#         if row["state_id"] == "CA":
#             return row["snap_CA"]
#         elif row["state_id"] == "TX":
#             return row["snap_TX"]
#         elif row["state_id"] == "WI":
#             return row["snap_WI"]
#         return 0

#     df["snap_flag"] = df.apply(get_snap_flag, axis=1)
#     return df


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    df["is_holiday"] = (
        df["event_name_1"].notna() | df["event_name_2"].notna()
        ).astype(int)
    df["is_weekend"] = df["sale_date"].dt.dayofweek.isin([5, 6]).astype(int)
    df["week_of_year"] = df["sale_date"].dt.isocalendar().week.astype(int)
    df["is_month_start"] = df["sale_date"].dt.is_month_start.astype(int)
    df["is_month_end"] = df["sale_date"].dt.is_month_end.astype(int)

    return df


def merge_price_features(df: pd.DataFrame, prices: pd.DataFrame) -> pd.DataFrame:
    df = df.merge(
        prices,
        on=["store_id", "item_id", "wm_yr_wk"],
        how="left"
    )

    df = df.sort_values(["client_id", "item_id", "sale_date"])

    df["price_change_rate"] = (
    df.groupby(["client_id", "item_id"])["sell_price"]
    .pct_change(fill_method=None)
    .fillna(0)
)

    return df


def add_time_series_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["client_id", "item_id", "sale_date"]).copy()
    group_cols = ["client_id", "item_id"]

    # lag feature
    df["lag_7"] = df.groupby(group_cols)["sales"].shift(7)
    df["lag_14"] = df.groupby(group_cols)["sales"].shift(14)
    df["lag_28"] = df.groupby(group_cols)["sales"].shift(28)

    # rolling feature
    df["rolling_mean_7"] = (
        df.groupby(group_cols)["sales"]
        .transform(lambda s: s.shift(1).rolling(7).mean())
    )

    df["rolling_mean_28"] = (
        df.groupby(group_cols)["sales"]
        .transform(lambda s: s.shift(1).rolling(28).mean())
    )

    df["rolling_std_7"] = (
        df.groupby(group_cols)["sales"]
        .transform(lambda s: s.shift(1).rolling(7).std())
    )

    df["rolling_std_28"] = (
        df.groupby(group_cols)["sales"]
        .transform(lambda s: s.shift(1).rolling(28).std())
    )

    return df



def add_targets(df):
    df = df.sort_values(["client_id", "item_id", "sale_date"]).copy()
    group_cols = ["client_id", "item_id"]

    df["target_7d"] = (
        df.groupby(group_cols)["sales"]
        .transform(lambda s: sum(s.shift(-i) for i in range(1, 8)))
    )

    return df



def drop_feature_na(df: pd.DataFrame) -> pd.DataFrame:
    required_cols = FEATURE_COLS + ["target_7d"]
    return df.dropna(subset=required_cols).copy()



def filter_clients_by_min_rows(
    df: pd.DataFrame,
    min_rows: int = 500
) -> pd.DataFrame:

    client_counts = df.groupby("client_id").size()
    valid_clients = client_counts[client_counts >= min_rows].index

    filtered_df = df[df["client_id"].isin(valid_clients)].copy()

    print("client row filtering")
    print("before clients:", df["client_id"].nunique())
    print("after clients:", filtered_df["client_id"].nunique())
    print("removed clients:", df["client_id"].nunique() - filtered_df["client_id"].nunique())

    return filtered_df



def cap_rows_per_client(
    df: pd.DataFrame,
    max_rows: int = 20000
) -> pd.DataFrame:
    """
    client별 row 수 상한 제한

    데이터가 너무 많은 client가 학습과 aggregation에 과도하게 영향을 주는 것을 줄이기 위해,
    각 client에서 최근 max_rows개 row만 유지한다.
    """

    capped_df = (
        df.sort_values(["client_id", "sale_date"])
        .groupby("client_id", group_keys=False)
        .tail(max_rows)
        .copy()
    )

    print("client row capping")
    print("before rows:", len(df))
    print("after rows:", len(capped_df))
    print("max rows per client:", max_rows)

    return capped_df



def add_time_split(
    df,
    date_col="sale_date",
    train_ratio=0.7,
    valid_ratio=0.15
):
    df = df.sort_values(date_col).copy()

    unique_dates = sorted(df[date_col].unique())
    n_dates = len(unique_dates)

    train_end = int(n_dates * train_ratio)
    valid_end = int(n_dates * (train_ratio + valid_ratio))

    train_dates = unique_dates[:train_end]
    valid_dates = unique_dates[train_end:valid_end]
    test_dates = unique_dates[valid_end:]

    df["split"] = "train"
    df.loc[df[date_col].isin(valid_dates), "split"] = "valid"
    df.loc[df[date_col].isin(test_dates), "split"] = "test"

    return df
