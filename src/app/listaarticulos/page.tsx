import ListaArticulos from "@/components/articulos/ListaArticulos";
import { getArticulos } from "@/lib/google-sheets";

export default async function ListaArticulosPage() {
  const articulos = await getArticulos();
  return <ListaArticulos articulos={articulos} />;
}
