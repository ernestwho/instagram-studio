"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { stileBottone } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";

export default function Accedi() {
  const router = useRouter();
  const [errore, setErrore] = useState("");
  const [inCorso, setInCorso] = useState(false);

  // onSubmit e non "action": così dopo un errore il form non si svuota.
  async function accedi(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    setInCorso(true);
    setErrore("");
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setInCorso(false);
    if (error) setErrore(error.message === "Invalid login credentials" ? "Email o password sbagliate." : error.message);
    else router.replace("/piano");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <p className="font-display text-5xl font-bold uppercase leading-none tracking-wide">
        Instagram
        <br />
        <span className="text-accento">Studio</span>
      </p>
      <p className="mt-3 mb-10 text-testo-2">Il tuo piano editoriale, sempre in tasca.</p>
      <form onSubmit={accedi} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-xl border border-bordo bg-superficie px-4 py-3 text-base outline-none focus:border-accento"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-xl border border-bordo bg-superficie px-4 py-3 text-base outline-none focus:border-accento"
          />
        </label>
        {errore && (
          <p role="alert" className="text-sm text-errore">
            {errore}
          </p>
        )}
        <button type="submit" disabled={inCorso} className={`${stileBottone} mt-2`}>
          {inCorso ? "Accesso…" : "Accedi"}
        </button>
      </form>
    </main>
  );
}
