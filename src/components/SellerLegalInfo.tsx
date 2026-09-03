import {
  STORE_CONFIG,
  formatTrPhone,
  telHref,
} from "@/lib/store-config";

type Props = {
  className?: string;
  compact?: boolean;
};

/** iyzico / 6563 merchant identity. Labels stay Turkish for reviewer scanners. */
export function SellerLegalInfo({ className, compact = false }: Props) {
  const phone = formatTrPhone(STORE_CONFIG.legalPhone);

  if (compact) {
    return (
      <div className={className}>
        <p className="font-medium text-slate-700">
          {STORE_CONFIG.legalName} — CimcimKids
        </p>
        <p>Şahıs işletmesi (esnaf ve sanatkâr)</p>
        <p>
          {STORE_CONFIG.taxOffice} Vergi Dairesi · Vergi kimlik no{" "}
          {STORE_CONFIG.taxNumber}
        </p>
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

  return (
    <div className={className}>
      <p>
        <span className="font-medium">Ad Soyad:</span> {STORE_CONFIG.legalName}
      </p>
      <p>
        <span className="font-medium">İşletme adı:</span> CimcimKids
      </p>
      <p>
        <span className="font-medium">Unvan:</span> Şahıs işletmesi (esnaf ve
        sanatkâr)
      </p>
      <p>
        <span className="font-medium">Vergi kimlik no:</span>{" "}
        {STORE_CONFIG.taxOffice} Vergi Dairesi — {STORE_CONFIG.taxNumber}
      </p>
      <p>
        <span className="font-medium">Merkez adresi:</span>{" "}
        {STORE_CONFIG.legalAddress}
      </p>
      <p>
        <span className="font-medium">Telefon:</span>{" "}
        <a className="hover:text-olive" href={telHref(STORE_CONFIG.legalPhone)}>
          {phone}
        </a>
      </p>
      <p>
        <span className="font-medium">E-posta:</span>{" "}
        <a
          className="hover:text-olive"
          href={`mailto:${STORE_CONFIG.legalEmail}`}
        >
          {STORE_CONFIG.legalEmail}
        </a>
      </p>
      <p>
        <span className="font-medium">KEP adresi:</span> Kayıtlı elektronik posta
        (KEP) adresi bulunmamaktadır.
      </p>
      <p>
        <span className="font-medium">Meslek odası:</span> Esnaf ve sanatkâr
        (şahıs işletmesi) olarak ilgili esnaf ve sanatkârlar odası mevzuatına
        tabidir. Tacir olmadığı için ticaret unvanı, ticaret sicili ve MERSİS
        numarası bulunmamaktadır.
      </p>
      <p>
        <span className="font-medium">Mesleki davranış kuralları:</span> Meslekle
        ilgili davranış kurallarına Türkiye Esnaf ve Sanatkârları Konfederasyonu
        (TESK) üzerinden elektronik olarak{" "}
        <a
          className="underline hover:text-olive"
          href="https://www.tesk.org.tr"
          target="_blank"
          rel="noopener noreferrer"
        >
          tesk.org.tr
        </a>{" "}
        adresinden ulaşılabilir. Tüketici mevzuatı (6502 sayılı Tüketicinin
        Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği) metinlerine{" "}
        <a
          className="underline hover:text-olive"
          href="https://www.mevzuat.gov.tr"
          target="_blank"
          rel="noopener noreferrer"
        >
          mevzuat.gov.tr
        </a>{" "}
        üzerinden elektronik olarak ulaşılabilir.
      </p>
    </div>
  );
}
