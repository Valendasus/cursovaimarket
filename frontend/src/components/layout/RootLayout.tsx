import Footer from '@/components/common/Footer'
import Header from '@/components/common/Header'
import { Outlet } from '@tanstack/react-router'

export default function RootLayout() {
	return (
		<div className='flex min-h-screen flex-col bg-background'>
			<Header />
			<main className='flex-1 pt-16'>
				<Outlet />
			</main>
			<Footer />
		</div>
	)
}
