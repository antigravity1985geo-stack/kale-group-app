import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/cart/CartDrawer';
import HomePage from './pages/HomePage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ProductPage from './pages/ProductPage';
import AdminPanel from './AdminPanel';
import WishlistDrawer from './components/wishlist/WishlistDrawer';
import AIChatBot from './components/ui/AIChatBot';

function ScrollToTopManager() {
  const { pathname, hash } = window.location;
  
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

export default function App() {
  const [isWishlistOpen, setIsWishlistOpen] = React.useState(false);

  return (
    <BrowserRouter>
      <ScrollToTopManager />
      <AuthProvider>
      <HelmetProvider>
        <WishlistProvider>
          <CartProvider>
          <div className="min-h-screen bg-brand-50 text-brand-900 font-sans selection:bg-brand-200 flex flex-col">
            <Toaster position="bottom-right" reverseOrder={false} />
            <Header onOpenWishlist={() => setIsWishlistOpen(true)} />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                
                {/* Admin Route (No generic Header/Footer) */}
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </main>
            <Footer />
            
            <CartDrawer />
            <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
            <AIChatBot />
          </div>
        </CartProvider>
      </WishlistProvider>
      </HelmetProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
