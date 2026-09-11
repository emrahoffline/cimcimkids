import { GA_MEASUREMENT_ID, isGaConfigured } from "@/lib/google-analytics";

/** Official gtag snippet in <head> so Google's installer can detect it. */
export function GoogleTag() {
  if (!isGaConfigured()) return null;
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false, anonymize_ip: true });`,
        }}
      />
    </>
  );
}
