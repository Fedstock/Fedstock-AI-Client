import pandas as pd
from pathlib import Path


# 06 server_table_builder
"""
중앙 서버에서 사용할 서버용 테이블 생성/저장 코드
1. 서버용 STORES 테이블 생성 (나중에 PostgreSQL로 바꿔도 됨)
2. 서버용 Feature Importance 저장
"""


def build_stores_table(dataset: pd.DataFrame) -> pd.DataFrame:
    stores = dataset[[
        "client_id", "store_id", "state_id", "dept_id"
    ]].drop_duplicates().copy()

    stores["store_name"] = stores["store_id"]
    stores["region_type"] = stores["state_id"]
    stores["main_category"] = stores["dept_id"]
    stores["status"] = "active"
    stores["registered_at"] = pd.to_datetime("2011-01-29")
    stores["updated_at"] = pd.Timestamp.now()

    return stores


def save_server_tables(
    stores: pd.DataFrame,
    output_dir: str = "data/server"
):
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    stores.to_csv(output_path / "stores.csv", index=False)
