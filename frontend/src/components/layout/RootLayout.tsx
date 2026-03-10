import { refreshApi } from '@/api/auth'
import Footer from '@/components/common/Footer'
import Header from '@/components/common/Header'
import { useAuthStore } from '@/store/authStore'
import { Outlet } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

export default function RootLayout() {
	const { setUser, isAuthenticated } = useAuthStore()
	const restored = useRef(false)

	// On first mount try to restore session from httpOnly refresh_token cookie
	useEffect(() => {
		if (restored.current || isAuthenticated) return
		restored.current = true
		refreshApi()
			.then(({ user, accessToken }) => setUser(user as any, accessToken))
			.catch(() => {}) // no cookie → stay logged out silently
	}, [isAuthenticated, setUser])

	return (
		<div className='flex min-h-screen flex-col bg-background'>
			<Header />
			<main className='flex-1'>
				<Outlet />
			</main>
			<Footer />
		</div>
	)
}
