import sqlite3
import pandas as pd
from pathlib import Path
from data.feature_engineer import FEATURE_COLS


# 05 db_writer
"""
클라이언트별 SQLite DB 저장 코드 **DB 저장만 담당**
"""


def save_clients_to_sqlite(
    dataset: pd.DataFrame,
    inventory: pd.DataFrame,
    output_dir: str = "data/clients"
):
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    for client_id, client_df in dataset.groupby("client_id"):
        db_path = output_path / f"client_{client_id}.db"
        conn = sqlite3.connect(db_path)

        sales_records = client_df[[
            "item_id", "sale_date", "sales"
        ]].copy()

        optional_cols = [col for col in ["target_1d", "target_7d", "split"] if col in client_df.columns]
        features = client_df[
            ["item_id", "sale_date"] + FEATURE_COLS + optional_cols
        ].copy()

        client_inventory = inventory[inventory["client_id"] == client_id].copy()

        # db 생성 - 매장 클라이언트가 자기 로컬 db를 가짐
        # 추후 postgresql 쓸 때 바꿔야 함
        sales_records.to_sql(
            "SALES_RECORDS", conn, if_exists="replace", index=False
        )
        features.to_sql(
            "FEATURES", conn, if_exists="replace", index=False
        )
        client_inventory.to_sql(
            "INVENTORY", conn, if_exists="replace", index=False
        )

        conn.close()
