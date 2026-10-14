import { Protetto } from "@/components/accesso";
import { Navigazione } from "@/components/navigazione";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Protetto>
      <Navigazione />
      <div className="md:pl-64">
        <main className="pb-barra mx-auto w-full max-w-3xl px-4 md:mx-0 md:max-w-5xl pt-[max(1.25rem,env(safe-area-inset-top))] md:px-10 md:pt-8 md:pb-12">
          {children}
        </main>
      </div>
    </Protetto>
  );
}
