import ListVentas from "@/components/ventas/ListVentas";
import { getVentas } from "@/lib/google-sheets";

export default async function ListaVentasPage() {
  const ventas = await getVentas();
  return <ListVentas ventas={ventas} />;
}
