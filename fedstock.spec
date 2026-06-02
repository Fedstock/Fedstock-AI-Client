# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

block_cipher = None

# flwr는 mypyc 컴파일 바이너리를 포함하므로 collect_all로 전체 수집
flwr_datas, flwr_binaries, flwr_hiddenimports = collect_all("flwr")

a = Analysis(
    ["launcher.py"],
    pathex=["."],
    binaries=flwr_binaries,
    datas=flwr_datas + [
        ("outputs", "outputs"),
        ("frontend/dist", "frontend/dist"),
        ("fedstock.config.json", "."),
    ],
    hiddenimports=flwr_hiddenimports + [
        # gRPC
        "grpc",
        "grpc._cython",
        "grpc._cython.cygrpc",
        "google.protobuf",
        "google.protobuf.descriptor",
        "google.protobuf.descriptor_pool",
        "google.protobuf.symbol_database",
        # uvicorn
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        # sklearn
        "sklearn.utils._cython_blas",
        "sklearn.neighbors.quad_tree",
        "sklearn.tree._utils",
        "sklearn.tree._classes",
        # xgboost
        "xgboost",
        "xgboost.sklearn",
        # misc
        "pandas",
        "numpy",
        "torch",
        "torch.nn",
        "pyarrow",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="fedstock",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,   # 첫 배포는 True로 두어 오류 확인 가능하게 유지
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="fedstock",
)
