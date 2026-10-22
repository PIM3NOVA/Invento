// Pobranie faktury jako pliku XML w formacie KSeF (/faktury/[id]/ksef)
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { invoiceToKsefXml } from "@/lib/ksef";

export async function GET(_request: Request, { params }: RouteContext<"/faktury/[id]/ksef">) {
  if (!(await getCurrentUser())) {
    return new Response("Brak dostępu.", { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, customer: { select: { country: true } } },
  });
  if (!invoice) {
    return new Response("Nie znaleziono faktury.", { status: 404 });
  }

  let xml: string;
  try {
    xml = invoiceToKsefXml({ ...invoice, buyerCountry: invoice.customer.country });
  } catch (error) {
    return new Response((error as Error).message, {
      status: 422,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // FV/2026/10/0001 -> FV_2026_10_0001.xml
  const fileName = `${invoice.number.replace(/\//g, "_")}.xml`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
