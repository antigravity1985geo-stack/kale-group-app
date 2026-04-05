import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WishlistDrawer({ isOpen, onClose }: WishlistDrawerProps) {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-[60]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b border-brand-100 flex items-center justify-between bg-brand-50/50">
              <div className="flex items-center gap-2">
                <Heart className="text-red-500 fill-red-500" size={20} />
                <h2 className="text-xl font-serif text-brand-900">რჩეულები</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-brand-100 rounded-full transition-colors text-brand-400 hover:text-brand-900"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {wishlist.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center text-brand-200">
                    <Heart size={40} />
                  </div>
                  <div>
                    <p className="text-lg font-serif text-brand-900 mb-1">სია ცარიელია</p>
                    <p className="text-sm text-brand-400">თქვენ ჯერ არ დაგიმატებიათ ნივთები რჩეულებში</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-8 py-3 bg-brand-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-brand-800 transition-all"
                  >
                    კატალოგის დათვალიერება
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {wishlist.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 group"
                    >
                      <div className="w-24 h-32 rounded-xl overflow-hidden bg-brand-50 shrink-0 border border-brand-100">
                        <img 
                          src={item.images[0]} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-serif text-brand-900 text-lg leading-tight">{item.name}</h3>
                            <button 
                              onClick={() => removeFromWishlist(item.id)}
                              className="text-brand-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-[10px] font-bold tracking-widest text-brand-400 uppercase mt-1">{item.category}</p>
                          <p className="mt-2 font-bold text-brand-900">₾{item.price.toLocaleString()}</p>
                        </div>
                        
                        <button
                          onClick={() => {
                            addToCart(item);
                            removeFromWishlist(item.id);
                          }}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-brand-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-brand-800 transition-all"
                        >
                          <ShoppingBag size={14} />
                          კალათაში
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {wishlist.length > 0 && (
              <div className="p-6 border-t border-brand-100 bg-brand-50/30">
                <p className="text-[10px] text-center text-brand-400 uppercase tracking-widest font-bold">
                  ჯამში {wishlist.length} ნივთი
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
