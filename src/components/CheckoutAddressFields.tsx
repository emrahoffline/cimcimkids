"use client";

import { useTranslations } from "next-intl";
import { listDistricts, listProvinces, TURKEY_COUNTRY } from "@/lib/turkey-locations";
import type { InvoiceType } from "@/lib/shipping-address";

export type CheckoutAddressValues = {
  addressTitle: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  postalCode: string;
  invoiceType: InvoiceType;
  companyName: string;
  taxOffice: string;
  taxNumber: string;
};

type Props = {
  values: CheckoutAddressValues;
  onChange: (patch: Partial<CheckoutAddressValues>) => void;
};

export function CheckoutAddressFields({ values, onChange }: Props) {
  const t = useTranslations("checkout");
  const provinces = listProvinces();
  const districts = values.city ? listDistricts(values.city) : [];

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-olive">{t("deliveryAddress")}</h2>

      <input
        required
        maxLength={80}
        autoComplete="nickname"
        placeholder={t("addressTitlePlaceholder")}
        aria-label={t("addressTitle")}
        className="input-field"
        value={values.addressTitle}
        onChange={(e) => onChange({ addressTitle: e.target.value })}
      />

      <input
        required
        maxLength={200}
        autoComplete="name"
        placeholder={t("namePlaceholder")}
        aria-label={t("namePlaceholder")}
        className="input-field"
        value={values.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-label={t("emailPlaceholder")}
          className="input-field"
          value={values.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
        <input
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t("phonePlaceholder")}
          aria-label={t("phonePlaceholder")}
          className="input-field"
          value={values.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          required
          disabled
          aria-label={t("country")}
          className="select-field"
          value="TR"
        >
          <option value="TR">{TURKEY_COUNTRY}</option>
        </select>
        <select
          required
          aria-label={t("city")}
          autoComplete="address-level1"
          className={`select-field ${values.city ? "" : "select-placeholder"}`}
          value={values.city}
          onChange={(e) =>
            onChange({ city: e.target.value, district: "" })
          }
        >
          <option value="">{t("cityPlaceholder")}</option>
          {provinces.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
        <select
          required
          aria-label={t("district")}
          autoComplete="address-level2"
          disabled={!values.city}
          className={`select-field ${values.district ? "" : "select-placeholder"}`}
          value={values.district}
          onChange={(e) => onChange({ district: e.target.value })}
        >
          <option value="">{t("districtPlaceholder")}</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      <textarea
        required
        rows={3}
        maxLength={500}
        autoComplete="street-address"
        placeholder={t("addressPlaceholder")}
        aria-label={t("address")}
        className="textarea-field"
        value={values.address}
        onChange={(e) => onChange({ address: e.target.value })}
      />

      <input
        inputMode="numeric"
        maxLength={5}
        autoComplete="postal-code"
        placeholder={t("postalCodePlaceholder")}
        aria-label={t("postalCode")}
        className="input-field"
        value={values.postalCode}
        onChange={(e) =>
          onChange({
            postalCode: e.target.value.replace(/\D/g, "").slice(0, 5),
          })
        }
      />

      <div className="pt-1">
        <p className="mb-2 text-sm font-medium text-olive">{t("invoiceType")}</p>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${
              values.invoiceType === "individual"
                ? "border-bamboo bg-bamboo/10 text-olive"
                : "border-olive/15 text-olive/70"
            }`}
          >
            <input
              type="radio"
              name="invoiceType"
              className="accent-olive"
              checked={values.invoiceType === "individual"}
              onChange={() => onChange({ invoiceType: "individual" })}
            />
            {t("invoiceIndividual")}
          </label>
          <label
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${
              values.invoiceType === "corporate"
                ? "border-bamboo bg-bamboo/10 text-olive"
                : "border-olive/15 text-olive/70"
            }`}
          >
            <input
              type="radio"
              name="invoiceType"
              className="accent-olive"
              checked={values.invoiceType === "corporate"}
              onChange={() => onChange({ invoiceType: "corporate" })}
            />
            {t("invoiceCorporate")}
          </label>
        </div>
      </div>

      {values.invoiceType === "corporate" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            maxLength={200}
            placeholder={t("companyNamePlaceholder")}
            aria-label={t("companyName")}
            className="input-field sm:col-span-2"
            value={values.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
          />
          <input
            required
            maxLength={80}
            placeholder={t("taxOfficePlaceholder")}
            aria-label={t("taxOffice")}
            className="input-field"
            value={values.taxOffice}
            onChange={(e) => onChange({ taxOffice: e.target.value })}
          />
          <input
            required
            inputMode="numeric"
            maxLength={10}
            placeholder={t("taxNumberPlaceholder")}
            aria-label={t("taxNumber")}
            className="input-field"
            value={values.taxNumber}
            onChange={(e) =>
              onChange({
                taxNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
