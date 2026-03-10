import { refreshApi } from '@/api/auth'
import PageLoader from '@/components/common/PageLoader'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import { router } from './router'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 min
			retry: 1,
		},
	},
})

/**
 * Bootstrap — restores session from httpOnly cookie BEFORE the router mounts.
 * This eliminates the race condition where /dashboard’s beforeLoad fires
 * before refreshApi() resolves and incorrectly redirects to /login.
 */
function Bootstrap() {
	const [ready, setReady] = useState(false)
	const setUser = useAuthStore(s => s.setUser)

	useEffect(() => {
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

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<Bootstrap />
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	</StrictMode>,
)
