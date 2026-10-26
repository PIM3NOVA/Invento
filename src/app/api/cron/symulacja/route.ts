// Codzienne zadanie Vercel Cron – symulacja sprzedaży w sklepie demonstracyjnym.
// Vercel dołącza do żądania nagłówek Authorization z wartością CRON_SECRET.
import { simulateSales } from "@/lib/simulation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await simulateSales();
  return Response.json(result);
}
