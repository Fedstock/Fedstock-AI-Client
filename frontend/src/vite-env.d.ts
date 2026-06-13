/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LOCAL_API_URL?: string;
  readonly VITE_AI_API_URL?: string;
  readonly VITE_CENTRAL_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
