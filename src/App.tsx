import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/cart/CartDrawer';
import WishlistDrawer from './components/wishlist/WishlistDrawer';
import AIChatBot from './components/ui/AIChatBot';
import ReloadPrompt from './components/ui/ReloadPrompt';

// Lazy-loaded pages — each becomes its own chunk
const HomePage = React.lazy(() => import('./pages/HomePage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const PaymentSuccessPage = React.lazy(() => import('./pages/PaymentSuccessPage'));
const ProductPage = React.lazy(() => import('./pages/ProductPage'));
const AdminPanel = React.lazy(() => import('./AdminPanel'));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-900 animate-spin" />
  </div>
);

function ScrollToTopManager() {
  const { pathname, hash } = useLocation();
  
  React.useEffect(() => {
    // If there's a hash, let browser handle scrolling
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100); // Wait for render
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

function AppLayout() {
  const location = useLocation();
  const [isWishlistOpen, setIsWishlistOpen] = React.useState(false);
  const isAdminRoute = location.pathname.toLowerCase().startsWith('/admin');

  return (
    <>
      <ScrollToTopManager />
      <div className="min-h-screen bg-brand-50 text-brand-900 font-sans selection:bg-brand-200 flex flex-col">
        <Toaster position="bottom-right" reverseOrder={false} />
        {!isAdminRoute && <Header onOpenWishlist={() => setIsWishlistOpen(true)} />}
        <main className="flex-1">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/product/:id" element={<ProductPage />} />

              {/* Admin Route (No generic Header/Footer) */}
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </Suspense>
        </main>
        {!isAdminRoute && <Footer />}
        
        {!isAdminRoute && (
          <>
            <CartDrawer />
            <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
            <AIChatBot />
          </>
        )}
        <ReloadPrompt />
      </div>
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <HelmetProvider>
            <WishlistProvider>
              <CartProvider>
                <AppLayout />
              </CartProvider>
            </WishlistProvider>
          </HelmetProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
