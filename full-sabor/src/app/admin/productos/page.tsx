"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_ars: number;
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

export default function AdminProducts() {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;

  // ✅ Hooks SIEMPRE arriba, antes de cualquier return
  const [me, setMe] = useState<string | null>(null);

  const [items, setItems] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form producto
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [active, setActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  // Variantes (por producto)
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantDraft, setVariantDraft] = useState<Record<number, number>>({
    1: 0,
    5: 0,
    10: 0,
    25: 0,
  });
  const [variantActive, setVariantActive] = useState<Record<number, boolean>>({
    1: true,
    5: true,
    10: true,
    25: true,
  });

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMe(data.session?.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setMe(session?.user.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load productos (solo si es admin)
  useEffect(() => {
    if (me === adminEmail) loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }
    setItems((data ?? []) as Product[]);
  }

  async function loadVariants(productId: string) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("kg", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const rows = (data ?? []) as Variant[];
    setVariants(rows);

    // precargar inputs
    const draft: Record<number, number> = { 1: 0, 5: 0, 10: 0, 25: 0 };
    const act: Record<number, boolean> = { 1: true, 5: true, 10: true, 25: true };

    for (const v of rows) {
      draft[v.kg] = v.price_per_kg;
      act[v.kg] = v.is_active;
    }

    setVariantDraft(draft);
    setVariantActive(act);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDesc("");
    setPrice(0);
    setActive(true);
    setFile(null);

    // reset variantes
    setVariants([]);
    setVariantDraft({ 1: 0, 5: 0, 10: 0, 25: 0 });
    setVariantActive({ 1: true, 5: true, 10: true, 25: true });

    const input = document.getElementById("fileInput") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setName(p.name);
    setDesc(p.description ?? "");
    setPrice(p.price_ars);
    setActive(p.is_active);
    setFile(null);

    const input = document.getElementById("fileInput") as HTMLInputElement | null;
    if (input) input.value = "";

    loadVariants(p.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(f: File) {
    const ext = f.name.split(".").pop();
    const path = `products/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, f, { cacheControl: "3600", upsert: false });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function createProduct() {
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadImage(file);

      const { error } = await supabase.from("products").insert({
        name,
        description: desc || null,
        price_ars: price,
        image_url,
        is_active: active,
      });

      if (error) return alert(error.message);

      resetForm();
      await loadProducts();
      alert("Producto creado");
    } catch (e: any) {
      alert(e?.message ?? "Error");
    }
  }

  async function updateProduct() {
    if (!editingId) return;

    try {
      let image_url: string | undefined = undefined;
      if (file) image_url = await uploadImage(file);

      const payload: any = {
        name,
        description: desc || null,
        price_ars: price,
        is_active: active,
      };
      if (image_url !== undefined) payload.image_url = image_url;

      const { error } = await supabase.from("products").update(payload).eq("id", editingId);
      if (error) return alert(error.message);

      setFile(null);
      const input = document.getElementById("fileInput") as HTMLInputElement | null;
      if (input) input.value = "";

      await loadProducts();
      alert("Producto actualizado");
    } catch (e: any) {
      alert(e?.message ?? "Error");
    }
  }

  async function toggleActive(id: string, is_active: boolean) {
    const { error } = await supabase.from("products").update({ is_active: !is_active }).eq("id", id);
    if (error) return alert(error.message);
    await loadProducts();
  }

  async function removeProduct(id: string) {
    const ok = confirm("¿Eliminar producto?");
    if (!ok) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return alert(error.message);

    if (editingId === id) resetForm();
    await loadProducts();
  }

  async function saveVariants() {
    if (!editingId) return;

    const packs = [1, 5, 10, 25];

    const payload = packs.map((kg) => ({
      product_id: editingId,
      kg,
      price_per_kg: Number(variantDraft[kg] ?? 0),
      is_active: Boolean(variantActive[kg]),
    }));

    const { error } = await supabase
      .from("product_variants")
      .upsert(payload, { onConflict: "product_id,kg" });

    if (error) return alert(error.message);

    await loadVariants(editingId);
    alert("Variantes guardadas");
  }

  // ✅ returns después de hooks
  if (!me) {
    return (
      <main style={{ padding: 16 }}>
        Tenés que iniciar sesión en <a href="/admin">/admin</a>.
      </main>
    );
  }

  if (me !== adminEmail) {
    return <main style={{ padding: 16 }}>Acceso denegado.</main>;
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h1>Productos (Admin)</h1>
      <p>
        <a href="/">Volver a la tienda</a>
      </p>

      <section
        style={{
          background: "white",
          padding: 12,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,.08)",
        }}
      >
        <h2>{isEditing ? "Editar producto" : "Crear producto"}</h2>

        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />

        <textarea
          placeholder="Descripción"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />

        <input
          placeholder="Precio (campo opcional)"
          type="number"
          value={price}
          onChange={(e) => setPrice(parseInt(e.target.value || "0", 10))}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />

        <label style={{ display: "block", marginBottom: 8 }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo
        </label>

        <div style={{ marginBottom: 8 }}>
          <input id="fileInput" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            {isEditing ? "Si no elegís una imagen nueva, se mantiene la actual." : "Subí una imagen (opcional)."}
          </div>
        </div>

        {/* ✅ Variantes por KG: SOLO cuando se edita */}
        {isEditing ? (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eee" }}>
            <h3 style={{ margin: "0 0 8px" }}>Precios por KG</h3>

            <div style={{ display: "grid", gap: 10 }}>
              {[1, 5, 10, 25].map((kg) => (
                <div
                  key={kg}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr 100px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <strong>{kg} kg</strong>

                  <input
                    type="number"
                    placeholder="Precio por kg (ARS)"
                    value={variantDraft[kg] ?? 0}
                    onChange={(e) =>
                      setVariantDraft((prev) => ({
                        ...prev,
                        [kg]: parseInt(e.target.value || "0", 10),
                      }))
                    }
                    style={{ padding: 8 }}
                  />

                  <label style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                    <input
                      type="checkbox"
                      checked={variantActive[kg] ?? true}
                      onChange={(e) =>
                        setVariantActive((prev) => ({
                          ...prev,
                          [kg]: e.target.checked,
                        }))
                      }
                    />
                    Activo
                  </label>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={saveVariants}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Guardar variantes
              </button>

              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                Si un precio está en 0 o desactivado, ese pack no se mostrará en la tienda.
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {!isEditing ? (
            <button onClick={createProduct} style={{ padding: 10, cursor: "pointer" }}>
              Guardar
            </button>
          ) : (
            <>
              <button onClick={updateProduct} style={{ padding: 10, cursor: "pointer" }}>
                Guardar cambios
              </button>
              <button onClick={resetForm} style={{ padding: 10, cursor: "pointer" }}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </section>

      <h2 style={{ marginTop: 16 }}>Listado</h2>

      {items.length === 0 ? <p>No hay productos todavía.</p> : null}

      {items.map((p) => (
        <div
          key={p.id}
          style={{
            background: "white",
            padding: 12,
            borderRadius: 12,
            marginBottom: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,.06)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                style={{
                  width: 90,
                  height: 60,
                  objectFit: "cover",
                  borderRadius: 10,
                  background: "#f1f1f1",
                }}
              />
            ) : (
              <div style={{ width: 90, height: 60, borderRadius: 10, background: "#f1f1f1" }} />
            )}

            <div style={{ flex: 1, minWidth: 240 }}>
              <strong>{p.name}</strong> — ${p.price_ars} {p.is_active ? "(Activo)" : "(Pausado)"}
              <div style={{ fontSize: 12, opacity: 0.8 }}>{p.description}</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => startEdit(p)}>Editar</button>
              <button onClick={() => toggleActive(p.id, p.is_active)}>{p.is_active ? "Pausar" : "Activar"}</button>
              <button onClick={() => removeProduct(p.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}
