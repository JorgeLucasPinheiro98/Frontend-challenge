import {
    createRootRoute,
    createRoute,
    createRouter,
    lazyRouteComponent,
    redirect,
  } from "@tanstack/react-router"
  import type {
    BlockchainNetwork,
    CatalogSearchParams,
    NFTCollection,
  } from "@/domain/types"
  import { getStoredToken } from "@/infrastructure/http/client"
  import { NotFoundPage, RootLayout } from "./components/RootLayout"
  
  const rootRoute = createRootRoute({
    component: RootLayout,
    notFoundComponent: NotFoundPage,
  })
  
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    validateSearch: (search: Record<string, unknown>): CatalogSearchParams => ({
      q: typeof search.q === "string" && search.q ? search.q : undefined,
      collection:
        typeof search.collection === "string"
          ? (search.collection as NFTCollection)
          : undefined,
      network:
        typeof search.network === "string"
          ? (search.network as BlockchainNetwork)
          : undefined,
      minPrice:
        typeof search.minPrice === "string" && search.minPrice
          ? search.minPrice
          : undefined,
      maxPrice:
        typeof search.maxPrice === "string" && search.maxPrice
          ? search.maxPrice
          : undefined,
      tab:
        search.tab === "new" || search.tab === "trending" || search.tab === "all"
          ? search.tab
          : undefined,
      sort:
        search.sort === "price_asc" ||
        search.sort === "price_desc" ||
        search.sort === "recent"
          ? search.sort
          : undefined,
      page: Number(search.page) > 1 ? Number(search.page) : undefined,
    }),
    component: lazyRouteComponent(() => import("./pages/HomePage"), "HomePage"),
  })
  
  const nftDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/nfts/$nftId",
    component: lazyRouteComponent(
      () => import("./pages/NFTDetailPage"),
      "NFTDetailPage"
    ),
  })
  
  const cartRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/cart",
    component: lazyRouteComponent(() => import("./pages/CartPage"), "CartPage"),
  })
  
  const requireAuth = ({ location }: { location: { href: string } }) => {
    if (!getStoredToken()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      })
    }
  }
  
  const checkoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/checkout",
    beforeLoad: requireAuth,
    component: lazyRouteComponent(
      () => import("./pages/CheckoutPage"),
      "CheckoutPage"
    ),
  })
  
  const orderConfirmationRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orders/$orderId",
    beforeLoad: requireAuth,
    component: lazyRouteComponent(
      () => import("./pages/OrderConfirmationPage"),
      "OrderConfirmationPage"
    ),
  })
  
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    validateSearch: (search: Record<string, unknown>) => ({
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    }),
    component: lazyRouteComponent(
      () => import("./pages/AuthPage"),
      "LoginPage"
    ),
  })
  
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/register",
    validateSearch: (search: Record<string, unknown>) => ({
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    }),
    component: lazyRouteComponent(
      () => import("./pages/AuthPage"),
      "RegisterPage"
    ),
  })
  
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/profile",
    beforeLoad: requireAuth,
    component: lazyRouteComponent(
      () => import("./pages/ProfilePage"),
      "ProfilePage"
    ),
  })
  
  const walletsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/wallets",
    beforeLoad: requireAuth,
    component: lazyRouteComponent(
      () => import("./pages/WalletsPage"),
      "WalletsPage"
    ),
  })
  
  const routeTree = rootRoute.addChildren([
    indexRoute,
    nftDetailRoute,
    cartRoute,
    checkoutRoute,
    orderConfirmationRoute,
    loginRoute,
    registerRoute,
    profileRoute,
    walletsRoute,
  ])
  
  export const router = createRouter({
    routeTree,
    defaultPreload: "intent",
  })
  
  declare module "@tanstack/react-router" {
    interface Register {
      router: typeof router
    }
  }