import { Suspense } from "react";
import { Laboratorio } from "./laboratorio";

export default function Pagina() {
  return (
    <Suspense>
      <Laboratorio />
    </Suspense>
  );
}
