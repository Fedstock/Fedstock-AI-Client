# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ["launcher.py"],
    pathex=["."],
    binaries=[],
    datas=[
        ("outputs", "outputs"),
        ("frontend/dist", "frontend/dist"),
        ("fedstock.config.json", "."),
    ],
    hiddenimports=[
        # flwr / gRPC
        "flwr",
        "flwr.client",
        "flwr.client.numpy_client",
        "flwr.client.app",
        "flwr.common",
        "flwr.common.grpc",
        "flwr.proto",
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
    excludes=[
        # CUDA 제외 (CPU 전용 배포)
        "torch.cuda",
        "torch.backends.cuda",
        "torch.backends.cudnn",
    ],
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
