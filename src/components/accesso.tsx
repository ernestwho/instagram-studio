"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";

const SessioneContext = createContext<Session | null>(null);

export function useSessione() {
  return use(SessioneContext);
}

/** Mostra il contenuto solo con l'accesso fatto, altrimenti porta ad "Accedi". */
export function Protetto({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined);

  // Le pagine restano montate (nascoste) durante la navigazione: ogni volta che tornano visibili
  // l'effetto riparte e rilegge la sessione, invece di fidarsi dello stato vecchio.
  useEffect(() => {
    let attivo = true;
    const aggiorna = (s: Session | null) => {
      if (!attivo) return;
      setSessione(s);
      if (!s) router.replace("/accedi");
    };
    supabase.auth.getSession().then(({ data }) => aggiorna(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => aggiorna(s));
    return () => {
      attivo = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  if (!sessione) return <div className="min-h-dvh" aria-busy="true" />;
  return <SessioneContext value={sessione}>{children}</SessioneContext>;
}
