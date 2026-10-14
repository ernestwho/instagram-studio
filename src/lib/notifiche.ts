// Notifiche push lato browser: iscrizione del dispositivo, prova e orari dei promemoria.
import { supabase } from "./supabase/client";

export type Orari = { sera: number; partita: number };
export const ORARI_PREDEFINITI: Orari = { sera: 20, partita: 15 };

export function supportate() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Su iPhone le notifiche arrivano solo se l'app è aperta dall'icona sulla schermata Home. */
export function iphoneDaInstallare() {
  if (typeof window === "undefined") return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  return ios && !standalone;
}

function chiaveVapid() {
  const base64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const pulita = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(pulita), (c) => c.charCodeAt(0));
}

async function registrazione() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export async function iscrizioneAttuale() {
  if (!supportate()) return null;
  return (await registrazione()).pushManager.getSubscription();
}

function nomeDispositivo() {
  const ua = navigator.userAgent;
  const sistema = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Computer";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [sistema, browser].filter(Boolean).join(" · ");
}

export async function attiva() {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) throw new Error("Manca NEXT_PUBLIC_VAPID_PUBLIC_KEY nelle variabili di Vercel");
  const permesso = await Notification.requestPermission();
  if (permesso !== "granted") throw new Error("Permesso negato: abilita le notifiche per questo sito nelle impostazioni del browser");
  const reg = await registrazione();
  let iscrizione = await reg.pushManager.getSubscription();
  try {
    iscrizione ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveVapid() });
  } catch (e) {
    throw new Error(`Il browser non ha attivato le notifiche (${(e as Error).message}). Controlla i permessi del sito e riprova.`);
  }
  const json = iscrizione.toJSON();
  const { error } = await supabase
    .from("iscrizioni_push")
    .upsert({ endpoint: json.endpoint, chiavi: json.keys, dispositivo: nomeDispositivo() });
  if (error) throw new Error(error.message);
  return iscrizione;
}

export async function disattiva(iscrizione: PushSubscription) {
  await supabase.from("iscrizioni_push").delete().eq("endpoint", iscrizione.endpoint);
  await iscrizione.unsubscribe();
}

export async function prova(iscrizione: PushSubscription) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/promemoria/prova", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ iscrizione: iscrizione.toJSON() }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.errore ?? `Errore ${r.status}`);
}

export async function caricaOrari(): Promise<Orari> {
  const { data } = await supabase.from("impostazioni").select("valore").eq("chiave", "promemoria").maybeSingle();
  return { ...ORARI_PREDEFINITI, ...(data?.valore ?? {}) };
}

export async function salvaOrari(orari: Orari) {
  const { error } = await supabase.from("impostazioni").upsert({ chiave: "promemoria", valore: orari });
  if (error) throw new Error(error.message);
}

export async function caricaDispositivi(): Promise<{ endpoint: string; dispositivo: string; creata_il: string }[]> {
  const { data, error } = await supabase.from("iscrizioni_push").select("endpoint, dispositivo, creata_il").order("creata_il");
  if (error) throw new Error(error.message);
  return data;
}

export async function rimuoviDispositivo(endpoint: string) {
  const { error } = await supabase.from("iscrizioni_push").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
