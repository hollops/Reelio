/// <reference types="vite/client" />

// Tells TypeScript which environment variables exist, so typos are caught.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCK_API?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
