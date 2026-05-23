import numpy as np
import pandas as pd


# 04 inventory generation
"""
M5에서 없는 재고/발주 관련 값을 합성하는 코드
1. 재고 데이터 합성
2. 안전 재고와 추천 발주량 생성
"""


def generate_inventory(
    dataset: pd.DataFrame,
    seed: int = 42
) -> pd.DataFrame:
    np.random.seed(seed)

    inventory = dataset.groupby(["client_id", "item_id"]).tail(1).copy()

    inventory["current_stock"] = (
        inventory["rolling_mean_7"]
        * np.random.uniform(1.0, 2.5, size=len(inventory))
    ).round().astype(int)

    inventory["lead_time_days"] = np.random.randint(1, 8, size=len(inventory))
    inventory["target_service_level"] = 0.95
    inventory["service_level_z"] = 1.65

    inventory["on_order_qty"] = (
        inventory["rolling_mean_7"]
        * np.random.uniform(0.0, 1.0, size=len(inventory))
    ).round().astype(int)

    inventory["updated_at"] = pd.Timestamp.now()

    return inventory


def generate_order_recommendations(inventory: pd.DataFrame) -> pd.DataFrame:
    inventory["lead_time_demand"] = (
        # 예측 수요
        inventory["rolling_mean_7"] * inventory["lead_time_days"]
    )

    inventory["safety_stock"] = (
        # 안전 재고
        inventory["service_level_z"] * inventory["rolling_std_28"]
        * np.sqrt(inventory["lead_time_days"])
    )

    inventory["reorder_point"] = (
        inventory["lead_time_demand"] + inventory["safety_stock"]
    )

    inventory["recommended_order_qty"] = (
        # 추천 발주량
        inventory["reorder_point"] - inventory["current_stock"]
        - inventory["on_order_qty"]
    ).clip(lower=0).round().astype(int)

    return inventory