/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APOLLO_API_KEY: string;
  readonly VITE_APOLLO_USE_DEV_PROXY?: string;
  readonly VITE_APOLLO_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
