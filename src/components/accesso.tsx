"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { haAccesso, supabase } from "@/lib/supabase/client";

const SessioneContext = createContext<Session | null>(null);

export function useSessione() {
  return use(SessioneContext);
}

/** Mostra il contenuto solo con l'accesso fatto, altrimenti porta ad "Accedi". */
export function Protetto({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined);
  const [ammesso, setAmmesso] = useState<boolean | string | undefined>(undefined);

  // Le pagine restano montate (nascoste) durante la navigazione: ogni volta che tornano visibili
  // l'effetto riparte e rilegge la sessione, invece di fidarsi dello stato vecchio.
  useEffect(() => {
    let attivo = true;
    const aggiorna = (s: Session | null) => {
      if (!attivo) return;
      setSessione(s);
      if (!s) router.replace("/accedi");
      else
        haAccesso(s.user.id).then(
          (ok) => attivo && setAmmesso(ok),
          (e) => attivo && setAmmesso(e.message),
        );
    };
    supabase.auth.getSession().then(({ data }) => aggiorna(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => aggiorna(s));
    return () => {
      attivo = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  if (!sessione || ammesso === undefined) return <div className="min-h-dvh" aria-busy="true" />;
  if (ammesso !== true)
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
        <p className="font-display text-3xl font-bold uppercase tracking-wide">Accesso non abilitato</p>
        <p className="text-testo-2">
          {typeof ammesso === "string"
            ? `Non riesco a verificare l'accesso: ${ammesso}`
            : `L'account ${sessione.user.email} non è abilitato a Instagram Studio.`}
        </p>
        <button className="self-start text-accento underline" onClick={() => supabase.auth.signOut()}>
          Esci
        </button>
      </main>
    );
  return <SessioneContext value={sessione}>{children}</SessioneContext>;
}
