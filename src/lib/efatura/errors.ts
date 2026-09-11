export type EFaturaSendResult = {
  uuid: string;
  invoiceNumber?: string | null;
};

export class EFaturaError extends Error {
  status: number;
  body: string;

  constructor(message: string, status = 502, body = "") {
    super(message);
    this.name = "EFaturaError";
    this.status = status;
    this.body = body;
  }
}
