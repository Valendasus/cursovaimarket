import { createRouter, createRoute, createRootRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import RootLayout from "@/components/layout/RootLayout";
import PageLoader from "@/components/common/PageLoader";

const HomePage = lazy(() => import("@/pages/HomePage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const ServiceDetailPage = lazy(() => import("@/pages/ServiceDetailPage"));
const FreelancerPage = lazy(() => import("@/pages/FreelancerPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const wrap = (Component: React.ComponentType) => () => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: wrap(HomePage) });
const servicesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/services", component: wrap(ServicesPage) });
const serviceDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: "/services/$serviceId", component: wrap(ServiceDetailPage) });
const freelancerRoute = createRoute({ getParentRoute: () => rootRoute, path: "/freelancers/$freelancerId", component: wrap(FreelancerPage) });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: wrap(LoginPage) });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: "/register", component: wrap(RegisterPage) });
const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: "/dashboard", component: wrap(DashboardPage) });
const notFoundRoute = createRoute({ getParentRoute: () => rootRoute, path: "*", component: wrap(NotFoundPage) });

const routeTree = rootRoute.addChildren([
  indexRoute,
  servicesRoute,
  serviceDetailRoute,
  freelancerRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  notFoundRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
