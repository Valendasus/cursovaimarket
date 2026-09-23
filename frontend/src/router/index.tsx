import PageLoader from '@/components/common/PageLoader'
import RootLayout from '@/components/layout/RootLayout'
import RouteErrorPage from '@/pages/RouteErrorPage'
import { useAuthStore } from '@/store/authStore'
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/types'
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
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const InfoPage = lazy(() => import('@/pages/InfoPage'))

const wrap = (Component: React.ComponentType) => () => (
	<Suspense fallback={<PageLoader />}>
		<Component />
	</Suspense>
)

const rootRoute = createRootRoute({
	component: RootLayout,
	errorComponent: RouteErrorPage,
})

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: wrap(HomePage),
})
const servicesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/services',
	validateSearch: (search: Record<string, unknown>): { category?: ServiceCategory } => ({
		category:
			typeof search.category === 'string' &&
			Object.hasOwn(SERVICE_CATEGORIES, search.category)
				? (search.category as ServiceCategory)
				: undefined,
	}),
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
const verifyEmailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/verify-email',
	validateSearch: (s: Record<string, unknown>): { token?: string } => ({
		token: typeof s.token === 'string' ? s.token : undefined,
	}),
	component: wrap(VerifyEmailPage),
})
const resetPasswordRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/reset-password',
	validateSearch: (s: Record<string, unknown>): { token?: string } => ({
		token: typeof s.token === 'string' ? s.token : undefined,
	}),
	component: wrap(ResetPasswordPage),
})
const privacyRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/privacy',
	component: wrap(() => <InfoPage kind='privacy' />),
})
const termsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/terms',
	component: wrap(() => <InfoPage kind='terms' />),
})
const rulesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/rules',
	component: wrap(() => <InfoPage kind='rules' />),
})
const contactsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/contacts',
	component: wrap(() => <InfoPage kind='contacts' />),
})
const supportRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/support',
	component: wrap(() => <InfoPage kind='support' />),
})
const disputesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/disputes',
	component: wrap(() => <InfoPage kind='disputes' />),
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
	verifyEmailRoute,
	resetPasswordRoute,
	privacyRoute,
	termsRoute,
	rulesRoute,
	contactsRoute,
	supportRoute,
	disputesRoute,
	dashboardRoute,
	notFoundRoute,
])

export const router = createRouter({
	routeTree,
	scrollRestoration: true,
	defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}
