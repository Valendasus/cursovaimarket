import PageLoader from '@/components/common/PageLoader'
import RootLayout from '@/components/layout/RootLayout'
import { useAuthStore } from '@/store/authStore'
import {
	createRootRoute,
	createRoute,
	createRouter,
	redirect,
} from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('@/pages/HomePage'))
const ServicesPage = lazy(() => import('@/pages/ServicesPage'))
const ServiceDetailPage = lazy(() => import('@/pages/ServiceDetailPage'))
const FreelancersPage = lazy(() => import('@/pages/FreelancersPage'))
const FreelancerPage = lazy(() => import('@/pages/FreelancerPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const wrap = (Component: React.ComponentType) => () => (
	<Suspense fallback={<PageLoader />}>
		<Component />
	</Suspense>
)

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: wrap(HomePage),
})
const servicesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/services',
	component: wrap(ServicesPage),
})
const serviceDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/services/$serviceId',
	component: wrap(ServiceDetailPage),
})
const freelancersRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/freelancers',
	component: wrap(FreelancersPage),
})
const freelancerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/freelancers/$freelancerId',
	component: wrap(FreelancerPage),
})
const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login',
	validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
		redirect: typeof s.redirect === 'string' ? s.redirect : undefined,
	}),
	component: wrap(LoginPage),
})
const registerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/register',
	component: wrap(RegisterPage),
})
const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/dashboard',
	validateSearch: (
		search: Record<string, unknown>,
	): { tab?: string; partnerId?: string } => {
		const result: { tab?: string; partnerId?: string } = {}
		if (search.tab) result.tab = String(search.tab)
		if (search.partnerId) result.partnerId = String(search.partnerId)
		return result
	},
	beforeLoad: ({ location }) => {
		const { isAuthenticated } = useAuthStore.getState()
		if (!isAuthenticated) {
			throw redirect({ to: '/login', search: { redirect: location.pathname } })
		}
	},
	component: wrap(DashboardPage),
})
const notFoundRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '*',
	component: wrap(NotFoundPage),
})

const routeTree = rootRoute.addChildren([
	indexRoute,
	servicesRoute,
	serviceDetailRoute,
	freelancersRoute,
	freelancerRoute,
	loginRoute,
	registerRoute,
	dashboardRoute,
	notFoundRoute,
])

export const router = createRouter({ 
	routeTree,
	scrollRestoration: true, 
	defaultPreload: 'intent' 
})

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}
