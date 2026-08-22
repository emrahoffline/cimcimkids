import {
  STORE_CONFIG,
  formatTrPhone,
  telHref,
} from "@/lib/store-config";

type Props = {
  className?: string;
  showNationalId?: boolean;
};

export function SellerLegalInfo({ className, showNationalId = false }: Props) {
  const phone = formatTrPhone(STORE_CONFIG.legalPhone);

  return (
    <div className={className}>
      <p className="font-medium text-slate-700">
        {STORE_CONFIG.legalName} — CimcimKids
      </p>
      <p>Şahıs işletmesi</p>
      <p>
        {STORE_CONFIG.taxOffice} Vergi Dairesi · VN {STORE_CONFIG.taxNumber}
      </p>
      {showNationalId && <p>TCKN: {STORE_CONFIG.nationalId}</p>}
      <p>{STORE_CONFIG.legalAddress}</p>
      <p>
        Tel:{" "}
        <a className="hover:text-olive" href={telHref(STORE_CONFIG.legalPhone)}>
          {phone}
        </a>
        {" · "}
        <a
          className="hover:text-olive"
          href={`mailto:${STORE_CONFIG.legalEmail}`}
        >
          {STORE_CONFIG.legalEmail}
        </a>
      </p>
    </div>
  );
}
