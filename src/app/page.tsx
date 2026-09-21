import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Depende de cookies/sessão por requisição — nunca deve ser pré-renderizada
// estaticamente no build (isso já quebrou o build quando NEXTAUTH_URL ainda
// não estava configurado na Vercel).
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  redirect(session ? "/dashboard" : "/login");
}
