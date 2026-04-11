import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { getEffectivePrice } from '../../utils/price';
import { isProductOnActiveSale } from '../../utils/promotions';

export default function CartDrawer() {
  const { items, removeFromCart, updateQuantity, totalPrice, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-[100]"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-brand-100">
              <h2 className="text-2xl font-serif text-brand-900">თქვენი კალათა</h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-brand-50 rounded-full text-brand-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                  <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-2">
                    <X size={40} className="text-brand-300" />
                  </div>
                  <p className="text-xl font-serif text-brand-900">კალათა ცარიელია</p>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs font-bold tracking-widest uppercase text-brand-500 hover:text-brand-900"
                  >
                    დაბრუნდი კატალოგში
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-4 bg-brand-50 rounded-2xl p-4">
                      {/* Product Image */}
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-white shrink-0">
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-serif text-brand-900 text-lg leading-tight">{item.product.name}</h3>
                            <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mt-1">
                              {item.product.category}
                            </p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-brand-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                          <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center bg-white rounded-lg border border-brand-100 px-2 py-1">
                            <button 
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center text-brand-500 hover:text-brand-900 hover:bg-brand-50 rounded-md transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-brand-900">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center text-brand-500 hover:text-brand-900 hover:bg-brand-50 rounded-md transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="text-right">
                            {isProductOnActiveSale(item.product) && item.product.sale_price && (
                              <p className="text-xs text-brand-300 line-through">
                                ₾{(item.product.price * item.quantity).toLocaleString()}
                              </p>
                            )}
                            <p className="font-bold text-brand-900 text-lg">
                              ₾{(getEffectivePrice(item.product) * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-brand-100 bg-brand-50/50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-brand-500 text-sm tracking-wide">ჯამი:</span>
                  <span className="text-2xl font-bold text-brand-900 font-serif">
                    ₾{totalPrice.toLocaleString()}
                  </span>
                </div>
                
                <button
                  onClick={handleCheckout}
                  className="w-full py-5 bg-brand-900 text-white text-xs font-bold tracking-[0.2em] uppercase rounded-xl hover:bg-brand-800 transition-all shadow-xl shadow-brand-900/20 active:scale-95 flex items-center justify-center group"
                >
                  ყიდვის გაგრძელება
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
