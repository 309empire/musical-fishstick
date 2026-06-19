import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Check, ShoppingBag, Star, ExternalLink, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Product = {
  id: string;
  dbId: number;
  name: string;
  price: number;
  salePrice: number | null;
  onSale: boolean;
  icon: string;
  imageUrl: string | null;
  bgColor: string;
  accentColor: string;
  description: string;
  features: string[];
  badgeName: string | null;
  grantsPremium: boolean;
  isSeeded: boolean;
};

function normalizeProduct(raw: any): Product {
  return {
    id: raw.id ?? raw.slug ?? String(raw.dbId ?? raw.db_id ?? ""),
    dbId: raw.dbId ?? raw.db_id ?? 0,
    name: raw.name ?? "",
    price: typeof raw.price === "number" ? raw.price : parseFloat(raw.price) || 0,
    salePrice: raw.salePrice ?? raw.sale_price ?? null,
    onSale: raw.onSale ?? raw.on_sale ?? (raw.salePrice != null || raw.sale_price != null),
    icon: raw.icon ?? "📦",
    imageUrl: raw.imageUrl ?? raw.image_url ?? null,
    bgColor: raw.bgColor ?? raw.bg_color ?? "#0d0d0d",
    accentColor: raw.color ?? raw.accentColor ?? "#F97316",
    description: raw.description ?? "",
    features: Array.isArray(raw.features) ? raw.features : [],
    badgeName: raw.badgeName ?? raw.badge_name ?? null,
    grantsPremium: raw.grantsPremium ?? raw.grants_premium ?? false,
    isSeeded: raw.isSeeded ?? raw.is_seeded ?? false,
  };
}

function ProductCard({ product, owned, onClick }: { product: Product; owned: boolean; onClick: () => void }) {
  const displayPrice = product.onSale && product.salePrice != null ? product.salePrice : product.price;
  const salePercent = product.onSale && product.salePrice != null && product.price > 0
    ? Math.round((1 - product.salePrice / product.price) * 100)
    : null;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="cursor-pointer relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] group"
      style={{ borderColor: owned ? product.accentColor + "66" : product.onSale ? product.accentColor + "55" : undefined }}
    >
      {product.onSale && !owned && salePercent && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500 text-black">
          <Zap className="w-3 h-3" /> {salePercent}% OFF
        </div>
      )}
      <div className="h-48 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: product.bgColor }}>
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse at center, ${product.accentColor}, transparent 70%)` }} />
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover absolute inset-0" />
        ) : (
          <span className="text-7xl select-none relative z-10">{product.icon}</span>
        )}
        {owned && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-500/20 border border-green-500/30 text-green-400 z-20">
            <Check className="w-3 h-3" /> Owned
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="font-black text-lg leading-tight">{product.name}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{product.description}</p>
          </div>
          <div className="text-right shrink-0">
            {product.onSale && product.salePrice != null ? (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-gray-500 line-through">{product.price.toFixed(2)} €</span>
                <span className="text-2xl font-black" style={{ color: product.accentColor }}>{product.salePrice.toFixed(2)} €</span>
              </div>
            ) : (
              <span className="text-2xl font-black" style={{ color: product.accentColor }}>{product.price.toFixed(2)} €</span>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {product.features.slice(0, 3).map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-400">
              <span className="mt-0.5 shrink-0" style={{ color: product.accentColor }}>—</span>
              <span>{f}</span>
            </div>
          ))}
          {product.features.length > 3 && (
            <p className="text-[10px] text-gray-600 pl-4">+{product.features.length - 3} more...</p>
          )}
        </div>
        <button
          className="mt-5 w-full py-2.5 rounded-xl font-black text-sm border transition-all duration-300"
          style={{
            borderColor: product.accentColor,
            color: owned ? product.accentColor : "#000",
            backgroundColor: owned ? "transparent" : product.accentColor,
          }}
        >
          {owned ? "Already Owned" : "View"}
        </button>
      </div>
    </motion.div>
  );
}

function ProductDetail({ product, onBack }: { product: Product; onBack: () => void }) {
  const { user } = useAuth();
  const [showTicketMsg, setShowTicketMsg] = useState(false);
  const { data: orders } = useQuery<any[]>({ queryKey: ["/api/shop/my-orders"], enabled: !!user });

  const owned = orders?.some(o => o.productId === product.id && o.status === "completed");
  const displayPrice = product.onSale && product.salePrice != null ? product.salePrice : product.price;
  const salePercent = product.onSale && product.salePrice != null && product.price > 0
    ? Math.round((1 - product.salePrice / product.price) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="max-w-4xl mx-auto"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-black transition-all duration-300 mb-8 border border-white/10 hover:border-white hover:bg-white px-4 py-2 rounded-xl"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-white/10">
        <div className="h-72 md:h-auto flex items-center justify-center relative" style={{ backgroundColor: product.bgColor }}>
          <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(ellipse at center, ${product.accentColor}, transparent 70%)` }} />
          {product.onSale && !owned && salePercent && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-orange-500 text-black z-10">
              <Zap className="w-3.5 h-3.5" /> {salePercent}% OFF SALE
            </div>
          )}
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <span className="text-9xl select-none relative z-10">{product.icon}</span>
          )}
        </div>

        <div className="bg-[#0c0c0c] p-8 flex flex-col">
          <div className="mb-1">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl" style={{ backgroundColor: product.accentColor + "22" }}>
              {product.icon}
            </div>
            <h1 className="text-3xl font-black">{product.name}</h1>
            <p className="text-gray-400 text-sm mt-1">{product.description}</p>
          </div>

          <div className="mt-4 mb-6">
            {product.onSale && product.salePrice != null ? (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black" style={{ color: product.accentColor }}>{product.salePrice.toFixed(2)} €</span>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 line-through">{product.price.toFixed(2)} €</span>
                  {salePercent && <span className="text-xs font-black text-orange-400">{salePercent}% off · Limited time</span>}
                </div>
              </div>
            ) : (
              <span className="text-4xl font-black" style={{ color: product.accentColor }}>{product.price.toFixed(2)} €</span>
            )}
          </div>

          <div className="space-y-2 mb-6 flex-1">
            {product.features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="mt-0.5 font-black shrink-0" style={{ color: product.accentColor }}>—</span>
                <span>{f}</span>
              </div>
            ))}
          </div>

          {owned ? (
            <div className="py-3 rounded-xl text-center font-black text-sm border flex items-center justify-center gap-2"
              style={{ borderColor: product.accentColor + "44", color: product.accentColor, backgroundColor: product.accentColor + "11" }}>
              <Check className="w-4 h-4" /> Already Owned
            </div>
          ) : user ? (
            <div className="space-y-3">
              <AnimatePresence>
                {showTicketMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-3"
                  >
                    <span className="text-blue-400 text-lg shrink-0">🎫</span>
                    <div>
                      <p className="text-sm font-black text-blue-300 mb-0.5">Open a ticket on Discord</p>
                      <p className="text-[11px] text-blue-400/70 leading-relaxed">
                        To purchase this product, please open a ticket in our Discord server and a staff member will assist you.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowTicketMsg(true)}
                className="w-full py-3.5 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2 border border-transparent hover:border-white/20 hover:brightness-110"
                style={{ backgroundColor: product.accentColor, color: "#000" }}
              >
                <ExternalLink className="w-4 h-4" />
                Buy Now — {displayPrice.toFixed(2)} €
                {product.onSale && salePercent && <span className="ml-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-black">{salePercent}% OFF</span>}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
                <span className="text-yellow-500 text-lg shrink-0">⚠️</span>
                <p className="text-[11px] text-yellow-400/80">A <strong>Hexed account</strong> is required to purchase this product!</p>
              </div>
              <a href="/login" className="block w-full py-3.5 rounded-xl font-black text-sm text-center border border-white/20 hover:bg-white hover:text-black transition-all duration-300 text-white">
                Login
              </a>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Shop() {
  const [, params] = useRoute("/shop/:productId");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: rawProducts, isLoading: productsLoading } = useQuery<any[]>({ queryKey: ["/api/shop/products"] });
  const { data: orders } = useQuery<any[]>({ queryKey: ["/api/shop/my-orders"], enabled: !!user });

  const products: Product[] = (rawProducts || []).map(normalizeProduct);
  const selectedId = params?.productId;
  const selectedProduct = selectedId ? products.find(p => p.id === selectedId) : null;

  const isOwned = (id: string) => orders?.some(o => o.productId === id && o.status === "completed") || false;

  const lowestSale = products.length > 0
    ? products.reduce((min, p) => {
        const price = p.onSale && p.salePrice != null ? p.salePrice : p.price;
        return price < min ? price : min;
      }, Infinity)
    : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/[0.04] bg-[#050505]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-black text-orange-500 tracking-tighter">Hexed</a>
          <nav className="flex items-center gap-4">
            <a href="/shop" className="text-[10px] font-black uppercase tracking-widest text-orange-500 border-b border-orange-500 pb-0.5">Shop</a>
            {user ? (
              <a href="/dashboard" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all duration-300 border border-white/10 hover:border-white hover:bg-white px-3 py-1.5 rounded-lg">Dashboard</a>
            ) : (
              <a href="/login" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all duration-300 border border-white/10 hover:border-white hover:bg-white px-3 py-1.5 rounded-lg">Login</a>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {selectedProduct ? (
            <ProductDetail key={selectedProduct.id} product={selectedProduct} onBack={() => navigate("/shop")} />
          ) : selectedId && !productsLoading && !selectedProduct ? (
            <motion.div key="not-found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <p className="text-gray-500 text-sm">Product not found.</p>
              <button onClick={() => navigate("/shop")} className="mt-4 text-orange-500 text-sm font-black hover:underline">← Back to shop</button>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <ShoppingBag className="w-6 h-6 text-orange-500" />
                  <h1 className="text-4xl font-black">Shop</h1>
                </div>
                <p className="text-gray-500 text-sm">Enhance your Hexed profile with exclusive badges and features.</p>
                {lowestSale != null && lowestSale < Infinity && (
                  <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl w-fit">
                    <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-sm font-black text-purple-300">Premium starts at <span className="text-purple-400">{lowestSale.toFixed(2)}€</span></span>
                  </div>
                )}
              </div>

              {productsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 text-gray-600">No products available.</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      owned={isOwned(product.id)}
                      onClick={() => navigate(`/shop/${product.id}`)}
                    />
                  ))}
                </div>
              )}

              {user && orders && orders.length > 0 && (
                <div className="mt-12 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-6">
                  <h2 className="font-black text-sm uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4" /> My Purchases
                  </h2>
                  <div className="space-y-2">
                    {orders.map((order: any) => {
                      const p = products.find(pr => pr.id === order.productId);
                      return (
                        <div key={order.id} className="flex items-center gap-4 p-3 rounded-xl bg-black/40 border border-white/5">
                          <span className="text-2xl">{p?.icon || "📦"}</span>
                          <div className="flex-1">
                            <p className="font-black text-sm">{order.productName}</p>
                            <p className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-green-400 uppercase">
                            <Check className="w-3 h-3" /> {order.status}
                          </div>
                          <span className="text-[11px] font-mono text-gray-500">{order.price?.toFixed(2)} €</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
