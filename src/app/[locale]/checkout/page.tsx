import { isCardPaymentEnabled } from "@/lib/iyzico";
import { CheckoutClient } from "@/components/CheckoutClient";

export default function CheckoutPage() {
  return <CheckoutClient cardEnabled={isCardPaymentEnabled()} />;
}
