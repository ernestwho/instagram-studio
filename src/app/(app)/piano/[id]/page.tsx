import { Suspense } from "react";
import { SchedaContenuto } from "./scheda";

export default function Pagina({ params }: PageProps<"/piano/[id]">) {
  return (
    <Suspense>
      <SchedaContenuto params={params} />
    </Suspense>
  );
}
