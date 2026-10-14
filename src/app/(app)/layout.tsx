import { Protetto } from "@/components/accesso";
import { Navigazione } from "@/components/navigazione";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Protetto>
      <Navigazione />
      <main className="pb-barra mx-auto w-full max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] md:ml-56 md:pb-12 md:pl-10 lg:mx-auto">
        {children}
      </main>
    </Protetto>
  );
}
