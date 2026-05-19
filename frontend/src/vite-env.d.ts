/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string
	readonly VITE_PUBLIC_URL?: string
	readonly VITE_DEFAULT_AVATARS?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
