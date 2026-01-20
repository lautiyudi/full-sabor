"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Admin() {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState<string | null>(null);

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

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  const isAdmin = me === adminEmail;

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1>Admin</h1>

      {me ? (
        <>
          <p>
            Sesión iniciada: <strong>{me}</strong>
          </p>

          {isAdmin ? (
            <p>
              Ir a <a href="/admin/productos">/admin/productos</a>
            </p>
          ) : (
            <p style={{ color: "crimson" }}>
              Este usuario no está autorizado como admin.
            </p>
          )}

          <button onClick={logout} style={{ padding: 10, cursor: "pointer" }}>
            Cerrar sesión
          </button>
        </>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 10 }}
          />
          <input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 10 }}
          />

          <button onClick={login} style={{ padding: 10, cursor: "pointer" }}>
            Iniciar sesión
          </button>
        </div>
      )}
    </main>
  );
}
