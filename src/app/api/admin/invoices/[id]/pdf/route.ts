import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getInvoiceById } from "@/lib/invoices-db";
import { downloadInvoicePdf } from "@/lib/efatura/provider";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await context.params;
  const invoice = await getInvoiceById(id);
  if (
    !invoice ||
    (invoice.status !== "sent" &&
      !(invoice.status === "cancelled" && invoice.issuedAt))
  ) {
    return NextResponse.json({ error: "Fatura bulunamadı." }, { status: 404 });
  }

  try {
    const pdf = await downloadInvoicePdf(invoice.uuid, invoice.documentType);
    const filename = `${invoice.invoiceNumber || invoice.orderNumber || invoice.id}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[admin/invoices] pdf failed:", err);
    return NextResponse.json(
      { error: "PDF alınamadı." },
      { status: 502 }
    );
  }
}
