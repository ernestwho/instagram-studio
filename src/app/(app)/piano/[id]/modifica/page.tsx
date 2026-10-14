import { Suspense } from "react";
import { ModificaContenuto } from "@/components/modulo-contenuto";

export default function Pagina({ params }: PageProps<"/piano/[id]/modifica">) {
  return (
    <Suspense>
      <ModificaContenuto params={params} />
    </Suspense>
  );
}
