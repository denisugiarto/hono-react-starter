/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL API bila frontend di-host terpisah; kosong = same-origin. */
  readonly VITE_API_URL?: string
}
