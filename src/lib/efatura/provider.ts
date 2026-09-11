import "server-only";
import { getEFaturaProvider } from "@/lib/invoice-config";
import { bienDownloadInvoicePdf } from "./bien";
import { downloadInvoicePdf as downloadNilveraPdf } from "./nilvera";

export async function downloadInvoicePdf(
  uuid: string,
  documentType: "e_archive" | "e_invoice"
): Promise<Buffer> {
  const provider = getEFaturaProvider();
  if (provider === "bien") {
    return bienDownloadInvoicePdf(uuid);
  }
  return downloadNilveraPdf(uuid, documentType);
}
