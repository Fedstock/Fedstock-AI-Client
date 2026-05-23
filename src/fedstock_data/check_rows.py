import pandas as pd

df = pd.read_csv("data/processed/features.csv")

client_counts = (
    df.groupby("client_id")
    .size()
    .reset_index(name="row_count")
    .sort_values("row_count", ascending=False)
)

print("client 수:", client_counts["client_id"].nunique())
print(client_counts["row_count"].describe())

min_rows = client_counts["row_count"].min()
max_rows = client_counts["row_count"].max()
mean_rows = client_counts["row_count"].mean()
std_rows = client_counts["row_count"].std()

print("min:", min_rows)
print("max:", max_rows)
print("max/min ratio:", max_rows / min_rows)
print("std/mean ratio:", std_rows / mean_rows)

print("\n상위 10개 client")
print(client_counts.head(10))

print("\n하위 10개 client")
print(client_counts.tail(10))

client_counts.to_csv(
    "data/processed/client_row_count_summary.csv",
    index=False
)