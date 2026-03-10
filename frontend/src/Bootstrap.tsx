import { refreshApi } from '@/api/auth'
import PageLoader from '@/components/common/PageLoader'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Toaster } from 'sonner'
import { router } from './router'

/**
 * Bootstrap — restores session from httpOnly cookie BEFORE the router mounts.
 * Uses a ref guard so React 18 StrictMode double-invoke doesn't cause issues.
 */
export default function Bootstrap() {
	const [ready, setReady] = useState(false)
	const setUser = useAuthStore(s => s.setUser)
	const called = useRef(false)

	useEffect(() => {
		if (called.current) return
		called.current = true

		refreshApi()
			.then(({ user, accessToken }) => setUser(user as User, accessToken))
			.catch(() => {}) // no cookie → stay logged out silently
			.finally(() => setReady(true))
	}, [setUser])

	if (!ready) return <PageLoader />

	return (
		<>
			<RouterProvider router={router} />
			<Toaster
				richColors
				position='top-right'
				toastOptions={{ duration: 3500 }}
			/>
		</>
	)
}
