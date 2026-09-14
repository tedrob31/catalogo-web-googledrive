import { notFound } from 'next/navigation';

// En el dominio raíz, cualquier ruta no coincidente genera un 404 limpio
// Las tiendas de inquilinos son despachadas mediante subdominios a /t/[subdomain]/[[...slug]]
export default function CatchAllPage() {
  notFound();
}
