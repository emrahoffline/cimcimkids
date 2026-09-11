export type ChatTopic =
  | "track"
  | "giftCard"
  | "gift"
  | "returns"
  | "payment"
  | "care"
  | "shipping"
  | "size";

const RULES: { topic: ChatTopic; re: RegExp }[] = [
  {
    topic: "track",
    re: /takip|sipari[sş]\s*no|where.{0,12}(order|package)|track(ing)?|order number|kargo takip/,
  },
  {
    topic: "giftCard",
    re: /hediye\s*kart|gift\s*card/,
  },
  {
    topic: "gift",
    re: /hediye\s*(paket|not)|gift\s*wrap|paketle|hediye/,
  },
  {
    topic: "returns",
    re: /iade|iptal|cayma|return|refund|cancel/,
  },
  {
    topic: "payment",
    re: /[oö]deme|kart|havale|eft|iyzico|payment|visa|mastercard|troy/,
  },
  {
    topic: "care",
    re: /y[iı]kama|bak[iı]m|wash|care label|30\s*°/,
  },
  {
    topic: "shipping",
    re: /kargo|teslimat|shipping|delivery|kargo [uü]cret/,
  },
  {
    topic: "size",
    re: /beden|ya[sş]|size|sizing/,
  },
];

export function matchChatTopic(input: string): ChatTopic | null {
  const text = input.trim().toLocaleLowerCase("tr-TR");
  if (!text) return null;
  for (const rule of RULES) {
    if (rule.re.test(text)) return rule.topic;
  }
  return null;
}

export function shouldHideSiteChat(pathname: string): boolean {
  const path = pathname.replace(/^\/(tr|en)(?=\/|$)/, "") || "/";
  return (
    path.startsWith("/login") ||
    path.startsWith("/admin") ||
    path.startsWith("/auth")
  );
}
