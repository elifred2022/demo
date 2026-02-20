import { NextResponse } from "next/server";
import { articuloExistePorCodbarra } from "@/lib/google-sheets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codbarra = searchParams.get("codbarra")?.trim();
    const excluirId = searchParams.get("excluirId")?.trim();

    if (!codbarra) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const existe = await articuloExistePorCodbarra(codbarra, excluirId);
    return NextResponse.json({ exists: existe });
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}
