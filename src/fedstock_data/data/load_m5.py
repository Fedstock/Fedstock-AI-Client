import pandas as pd
from pathlib import Path


# 01 load_m5.py
"""
원본 csv 파일 로드 ->.py로 join하고 가공/추출 후 importance 부여
전체적인 순서: m5 데이터셋 로드 -> 세로로 변환 -> 날짜/가격 join -> 
피처 생성(보완) -> 재고 합성 -> SQLite 저장 -> 서버용 피처
"""


def load_m5(raw_dir: str = "data/raw"):
    raw_path = Path(raw_dir)
    sales = pd.read_csv(raw_path/"sales_train_evaluation.csv")
    calendar = pd.read_csv(raw_path/"calendar.csv")
    prices = pd.read_csv(raw_path/"sell_prices.csv")

    return sales, calendar, prices
