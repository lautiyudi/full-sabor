"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_ars: number; // compatibilidad (no se usa si hay variantes)
  image_url: string | null;
  is_active: boolean;
};

type Variant = {
  id: string;
  product_id: string;
  kg: number;
  price_per_kg: number;
  is_active: boolean;
};

type CartItem = {
  product: Product;
  qty: number;
  kg: number;
  pricePerKg: number;
};

function formatARS(n: number) {
  return n.toLocaleString("es-AR");
}
// 🔐 claves para guardar en el navegador
const CART_KEY = "full-sabor-cart-v1";

/** ✅ Hook simple para detectar mobile sin romper SSR */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

export default function Home() {
  const isMobile = useMediaQuery("(max-width: 520px)"); // ✅ MOBILE

  const [products, setProducts] = useState<Product[]>([]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, Variant[]>>({});
  const [selectedKg, setSelectedKg] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);

  // ♻️ Recuperar carrito guardado al iniciar la página
useEffect(() => {
  const saved = localStorage.getItem(CART_KEY);
  if (saved) {
    try {
      setCart(JSON.parse(saved));
    } catch {
      // si algo falla, no hacemos nada
    }
  }
}, []);
// 💾 Guardar carrito cada vez que cambia
// 💾 Guardar carrito cada vez que cambia (solo cuando ya está listo)
useEffect(() => {
  if (!cartReady) return; // ⛔ todavía no guardes

  localStorage.setItem("full-sabor-cart-v1", JSON.stringify(cart));
}, [cart, cartReady]);


  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setToastVisible(true);

    window.setTimeout(() => setToastVisible(false), 2000);
    window.setTimeout(() => setToast(null), 2400);
  }

  // Drawer carrito
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: prodData, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (prodErr || !prodData) return;

      const prods = prodData as Product[];
      setProducts(prods);

      const ids = prods.map((p) => p.id);
      if (ids.length === 0) return;

      const { data: varData, error: varErr } = await supabase
        .from("product_variants")
        .select("*")
        .in("product_id", ids)
        .eq("is_active", true)
        .order("kg", { ascending: true });

      if (varErr || !varData) return;

      const map: Record<string, Variant[]> = {};
      for (const v of varData as Variant[]) {
        if (!map[v.product_id]) map[v.product_id] = [];
        map[v.product_id].push(v);
      }
      setVariantsByProduct(map);

      const sel: Record<string, number> = {};
      for (const p of prods) {
        const arr = map[p.id] ?? [];
        if (arr.length > 0) sel[p.id] = arr[0].kg;
      }
      setSelectedKg(sel);
    })();
  }, []);
// ♻️ Recuperar carrito guardado al iniciar la página
useEffect(() => {
  const savedCart = localStorage.getItem("full-sabor-cart-v1");

  if (savedCart) {
    try {
      setCart(JSON.parse(savedCart));
    } catch {
      // si el dato está mal, no hacemos nada
    }
  }

  // 🚩 avisamos que ya terminamos de cargar el carrito
  setCartReady(true);
}, []);

  const totalItems = useMemo(() => cart.reduce((s, it) => s + it.qty, 0), [cart]);

  const total = useMemo(() => cart.reduce((sum, it) => sum + it.kg * it.pricePerKg * it.qty, 0), [cart]);

  function addToCart(p: Product) {
    const vars = variantsByProduct[p.id] ?? [];
    if (vars.length === 0) return alert("Este producto no tiene precios cargados. Cargalos desde Admin.");

    const kg = selectedKg[p.id] ?? vars[0].kg;
    const v = vars.find((x) => x.kg === kg) ?? vars[0];

    setCart((prev) => {
      const found = prev.find((x) => x.product.id === p.id && x.kg === v.kg);
      if (found) {
        return prev.map((x) => (x.product.id === p.id && x.kg === v.kg ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...prev, { product: p, qty: 1, kg: v.kg, pricePerKg: v.price_per_kg }];
    });

    setCheckoutOpen(true);
    showToast(`Agregado: ${p.name}`);
  }

  function decQty(productId: string, kg: number) {
    setCart((prev) =>
      prev
        .map((x) => (x.product.id === productId && x.kg === kg ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0)
    );
  }

  function incQty(productId: string, kg: number) {
    setCart((prev) => prev.map((x) => (x.product.id === productId && x.kg === kg ? { ...x, qty: x.qty + 1 } : x)));
  }

  function clearCart() {
  setCart([]);
  localStorage.removeItem(CART_KEY);
}


  function checkout() {
    if (cart.length === 0) return alert("El carrito está vacío");
    if (!name.trim() || !city.trim()) return alert("Completá nombre y localidad");

    const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE!;
    const business = "Distribuidora Full Sabor";

    const lines = cart
      .map((it) => {
        const itemTotal = it.kg * it.pricePerKg * it.qty;
        return `• ${it.product.name} — ${it.kg} kg ($${formatARS(it.pricePerKg)}/kg) x${it.qty} — $${formatARS(itemTotal)}`;
      })
      .join("\n");

    const message =
      `Hola! Soy *${name}* y quiero hacer este pedido en *${business}*:\n\n` +
      `${lines}\n\n` +
      `Envío: A coordinar por WhatsApp\n` +
      `TOTAL: $${formatARS(total)}\n\n` +
      `Datos para coordinar:\n` +
      `📍 Localidad: ${city}\n` +
      `📝 Observaciones: ${notes || "-"}\n\n` +
      `Gracias!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    // 🧹 Limpiar carrito luego de enviar pedido
localStorage.removeItem(CART_KEY);
setCart([]);

  }

  const inputStyleMobile: React.CSSProperties = {
    ...inputStyle,
    padding: isMobile ? "12px 12px" : inputStyle.padding,
    fontSize: isMobile ? 16 : 14, // ✅ evita zoom iPhone
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f6f7fb", paddingBottom: 40 }}>
      {/* Toast */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: isMobile ? 90 : 78,
            transform: toastVisible ? "translate(-50%, 0)" : "translate(-50%, 12px)",
            opacity: toastVisible ? 1 : 0,
            transition: "all .25s ease",
            zIndex: 80,
            background: "rgba(17,17,17,.92)",
            color: "white",
            padding: "10px 14px",
            borderRadius: 999,
            fontWeight: 800,
            boxShadow: "0 10px 25px rgba(0,0,0,.25)",
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          ✅ {toast}
        </div>
      ) : null}

      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #7a0000 0%, #b30000 100%)",
          color: "white",
          padding: "22px 16px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src="/logo.png"
              alt="Distribuidora Full Sabor"
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                borderRadius: 12,
                background: "white",
                padding: 6,
              }}
            />

            <div>
              <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1 }}>Distribuidora Full Sabor</h1>
              <p style={{ margin: "8px 0 0", opacity: 0.95 }}>Condimentos y especias — Pedí por WhatsApp</p>
            </div>
          </div>

          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE}`}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "white",
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 12,
              background: "#25D366",
              fontWeight: 700,
            }}
          >
            WhatsApp
          </a>
        </div>
      </header>

      {/* Content */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "14px 0 6px" }}>Productos</h2>
            <p style={{ margin: 0, color: "#555" }}>Precios por kg según cantidad. Envíos a coordinar por WhatsApp.</p>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "10px 12px",
              boxShadow: "0 2px 10px rgba(0,0,0,.06)",
              color: "#111",
              minWidth: 220,
            }}
          >
            <div style={{ fontWeight: 700 }}>Carrito</div>
            <div style={{ fontSize: 13, color: "#555" }}>
              {totalItems} item{totalItems === 1 ? "" : "s"} • TOTAL: ${formatARS(total)}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {products.map((p) => {
            const vars = variantsByProduct[p.id] ?? [];
            const currentKg = selectedKg[p.id] ?? (vars[0]?.kg ?? 1);
            const currentVar = vars.find((v) => v.kg === currentKg) ?? vars[0];
            const packTotal = currentVar ? currentKg * currentVar.price_per_kg : 0;
            const bestVar =
            vars.length > 0
            ? vars.reduce((best, v) => (v.price_per_kg < best.price_per_kg ? v : best), vars[0])
            : null;

            const isBestPrice = bestVar && currentVar && bestVar.kg === currentVar.kg;

            return (
              <div
                key={p.id}
                style={{
                  background: "white",
                  borderRadius: 18,
                  overflow: "hidden",
                  boxShadow: "0 4px 18px rgba(0,0,0,.08)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ height: 170, background: "#eee" }}>
                  {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>

                <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={badgeStyle2}>Descuento por cantidad</span>
                        {isBestPrice ? <span style={badgeBest}>Mejor precio</span> : null}
                      </div>
                      <strong style={{ fontSize: 18 }}>{p.name}</strong>
                    </div>

                    {currentVar ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <span
                          style={{
                            background: "#fff3f3",
                            color: "#b30000",
                            border: "1px solid #ffd0d0",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ${formatARS(currentVar.price_per_kg)}/kg
                        </span>

                        <span style={{ fontSize: 12, color: "#333", fontWeight: 800 }}>
                          {currentKg} kg → ${formatARS(packTotal)}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#b30000" }}>Sin precios</span>
                    )}
                  </div>

                  {p.description ? (
                    <p style={{ margin: 0, color: "#555", fontSize: 13, lineHeight: 1.35 }}>{p.description}</p>
                  ) : (
                    <p style={{ margin: 0, color: "#777", fontSize: 13 }}>Elegí presentación y agregá al carrito.</p>
                  )}

                  <div style={{ marginTop: "auto", display: "grid", gap: 8 }}>
                    {vars.length > 0 ? (
                      <>
                        <select
                          value={currentKg}
                          onChange={(e) =>
                            setSelectedKg((prev) => ({
                              ...prev,
                              [p.id]: parseInt(e.target.value, 10),
                            }))
                          }
                          style={{
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: "1px solid #e6e6e6",
                            outline: "none",
                            width: "100%",
                            background: "white",
                          }}
                        >
                          {vars.map((v) => (
                            <option key={v.id} value={v.kg}>
                              {v.kg} kg — ${formatARS(v.price_per_kg)}/kg — Total ${formatARS(v.kg * v.price_per_kg)}
                            </option>
                          ))}
                        </select>

                        {bestVar && currentVar && bestVar.kg !== currentVar.kg ? (
  <div style={{ fontSize: 12, color: "#0b6b2b", fontWeight: 800 }}>
    Elegí {bestVar.kg} kg para pagar ${formatARS(bestVar.price_per_kg)}/kg (mejor precio).
  </div>
) : (
  <div style={{ fontSize: 12, color: "#666" }}>Cuanto más llevás, menos pagás por kg.</div>
)}

                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: "#b30000" }}>Sin variantes cargadas (cargalas desde Admin)</div>
                    )}

                    <button
                      onClick={() => addToCart(p)}
                      disabled={vars.length === 0}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "none",
                        cursor: vars.length === 0 ? "not-allowed" : "pointer",
                        background: vars.length === 0 ? "#ddd" : "#b30000",
                        color: vars.length === 0 ? "#666" : "white",
                        fontWeight: 800,
                      }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Botón flotante para abrir carrito */}
      <button
        onClick={() => setCheckoutOpen(true)}
        style={{
          position: "fixed",
          right: 16,
          bottom: isMobile ? 18 : 16,
          zIndex: 40,
          padding: isMobile ? "12px 16px" : "12px 14px",
          fontSize: isMobile ? 14 : 13,
          borderRadius: 999,
          border: "none",
          background: "#b30000",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
          boxShadow: "0 8px 20px rgba(0,0,0,.2)",
        }}
      >
        Carrito • ${formatARS(total)}
      </button>

      {/* Overlay */}
      {checkoutOpen ? (
        <div
          onClick={() => setCheckoutOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.25)",
            zIndex: 50,
          }}
        />
      ) : null}

      {/* Drawer right */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: isMobile ? "100%" : 320,
          maxWidth: isMobile ? "100vw" : "92vw",
          background: "white",
          boxShadow: checkoutOpen ? "-14px 0 40px rgba(0,0,0,.18)" : "-10px 0 30px rgba(0,0,0,.12)",
          transform: checkoutOpen ? "translateX(0)" : "translateX(110%)",
          transition: "transform .25s ease, box-shadow .25s ease",
          zIndex: 60,
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          borderLeft: "1px solid rgba(0,0,0,.06)",
          borderTopLeftRadius: isMobile ? 0 : 18,
          borderBottomLeftRadius: isMobile ? 0 : 18,
        }}
      >
        {/* Header drawer */}
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,

            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "rgba(255,255,255,.92)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",

          }}
        >
          <div>
            <div style={{ fontWeight: 900 }}>Carrito</div>
            <div style={{ fontSize: 13, color: "#555" }}>
              {totalItems} item{totalItems === 1 ? "" : "s"} • TOTAL: ${formatARS(total)}
            </div>
          </div>

          <button
            onClick={() => setCheckoutOpen(false)}
            style={{
              border: "1px solid #ddd",
              background: "white",
              padding: "8px 10px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            {isMobile ? "✕" : "Cerrar"}

          </button>
        </div>

        {/* Body drawer */}
        <div
          style={{
            padding: 14,
            overflow: "auto",
            display: "grid",
            gap: 10,
            WebkitOverflowScrolling: "touch", // ✅ scroll suave iPhone
            paddingBottom: 180,
          }}
        >
          {cart.length === 0 ? (
            <div style={{ color: "#666", fontSize: 14 }}>Tu carrito está vacío.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <strong>Productos</strong>
                <button
                  onClick={clearCart}
                  style={{
                    border: "1px solid #ddd",
                    background: "white",
                    padding: "6px 10px",
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                >
                  Vaciar
                </button>
              </div>

              {cart.map((it) => {
                const itemTotal = it.kg * it.pricePerKg * it.qty;
                return (
                  <div
                    key={`${it.product.id}-${it.kg}`}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 14,
                      padding: 10,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {it.product.name} — {it.kg} kg
                    </div>

                    <div style={{ fontSize: 13, color: "#555" }}>
                      ${formatARS(it.pricePerKg)}/kg • x{it.qty} • <strong>${formatARS(itemTotal)}</strong>
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => decQty(it.product.id, it.kg)} style={qtyBtnStyle}>
                        −
                      </button>
                      <button onClick={() => incQty(it.product.id, it.kg)} style={qtyBtnStyle}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer drawer */}
        {/* Footer drawer (Sticky) */}
<div
  style={{
    padding: 14,
    borderTop: "1px solid #eee",
    display: "grid",
    gap: 8,
    position: "sticky",
    bottom: 0,
    background: "rgba(255,255,255,.92)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 -10px 25px rgba(0,0,0,.06)",
  }}
>

          <input placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} style={inputStyleMobile} />
          <input placeholder="Localidad" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyleMobile} />
          <textarea
            placeholder="Observaciones"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ ...inputStyleMobile, minHeight: 70, resize: "vertical" }}
          />
        {isMobile ? (
  <button
    onClick={() => setCheckoutOpen(false)}
    style={{
      width: "100%",
      padding: 12,
      borderRadius: 16,
      border: "1px solid #ddd",
      background: "white",
      cursor: "pointer",
      fontWeight: 900,
    }}
  >
    Volver a productos
  </button>
) : null}

          <button
            onClick={checkout}
            disabled={cart.length === 0}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 16,
              border: "none",
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              background: cart.length === 0 ? "#ddd" : "#25D366",
              color: cart.length === 0 ? "#666" : "#0b2a16",
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            Finalizar compra por WhatsApp
          </button>

          <div style={{ fontSize: 12, color: "#666" }}>Envíos: se coordinan por WhatsApp según zona y disponibilidad.</div>
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid #e6e6e6",
  outline: "none",
  fontSize: 14,
};

const qtyBtnStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const badgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#fff3f3",
  color: "#b30000",
  border: "1px solid #ffd0d0",
};
const badgeBest: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#f1fff6",
  color: "#0b6b2b",
  border: "1px solid #b7f5cf",
};

const badgeStyle2: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#eef7ff",
  color: "#0b4ea2",
  border: "1px solid #cfe6ff",
};
