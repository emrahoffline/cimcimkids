"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/store-config";
import {
  matchChatTopic,
  shouldHideSiteChat,
  type ChatTopic,
} from "@/lib/site-chat";

type ChatLink = { href: string; label: string };

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  links?: ChatLink[];
  whatsapp?: boolean;
};

const QUICK_TOPICS: ChatTopic[] = [
  "shipping",
  "size",
  "payment",
  "returns",
  "giftCard",
  "track",
];

export function SiteChatbot() {
  const t = useTranslations("chatbot");
  const tFaq = useTranslations("faq");
  const tReturns = useTranslations("returns");
  const tGiftCards = useTranslations("giftCards");
  const locale = useLocale();
  const pathname = usePathname();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const seeded = useRef(false);

  const hidden = shouldHideSiteChat(pathname);
  const whatsappHref = getWhatsAppUrl(
    locale === "en"
      ? "Hello, I have a question from the CimcimKids chat."
      : "Merhaba, sitedeki sohbetten yazıyorum."
  );

  function nextId() {
    seq.current += 1;
    return `m${seq.current}`;
  }

  function answerFor(topic: ChatTopic): Omit<ChatMessage, "id" | "role"> {
    const trackLink = { href: `/${locale}/tracking`, label: t("trackLink") };
    const returnsLink = { href: `/${locale}/returns`, label: t("returnsLink") };
    const faqLink = { href: `/${locale}/faq`, label: t("faqLink") };
    const giftCardLink = {
      href: `/${locale}/gift-cards`,
      label: t("giftCardLink"),
    };

    switch (topic) {
      case "shipping":
        return { text: tFaq("a2"), links: [trackLink] };
      case "size":
        return { text: tFaq("a1"), links: [faqLink] };
      case "payment":
        return { text: tFaq("a3") };
      case "returns":
        return {
          text: `${tReturns("s1")} ${tReturns("s2")} ${tReturns("s3")}`,
          links: [returnsLink],
        };
      case "gift":
        return { text: tFaq("a5"), links: [giftCardLink] };
      case "giftCard":
        return { text: tGiftCards("subtitle"), links: [giftCardLink] };
      case "track":
        return { text: t("answers.track"), links: [trackLink] };
      case "care":
        return { text: tFaq("a4") };
    }
  }

  function pushExchange(userText: string, topic: ChatTopic | null) {
    const user: ChatMessage = { id: nextId(), role: "user", text: userText };
    const bot: ChatMessage = topic
      ? { id: nextId(), role: "bot", ...answerFor(topic) }
      : {
          id: nextId(),
          role: "bot",
          text: t("fallback"),
          whatsapp: true,
        };
    setMessages((prev) => [...prev, user, bot]);
  }

  useEffect(() => {
    if (!open) return;
    if (!seeded.current) {
      seeded.current = true;
      setMessages([
        {
          id: nextId(),
          role: "bot",
          text: t("welcome"),
        },
      ]);
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open, t]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  if (hidden) return null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    pushExchange(text, matchChatTopic(text));
  }

  return (
    <>
      {open ? (
        <div
          className="chatbot-panel flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-bamboo/20 bg-white shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)]"
          role="dialog"
          aria-labelledby={titleId}
          aria-modal="false"
        >
          <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-olive to-[#2ea396] px-4 py-3 text-white">
            <div>
              <p id={titleId} className="font-serif text-base font-semibold">
                {t("title")}
              </p>
              <p className="text-xs text-white/85">{t("subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-white/90 transition hover:bg-white/15"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex max-h-[min(22rem,52dvh)] min-h-[12rem] flex-col gap-3 overflow-y-auto px-3 py-3"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-8 self-end rounded-2xl rounded-br-md bg-bamboo px-3 py-2 text-sm text-white"
                    : "mr-6 self-start rounded-2xl rounded-bl-md bg-cream px-3 py-2 text-sm text-slate-700"
                }
              >
                <p>{message.text}</p>
                {message.links && message.links.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-olive underline-offset-2 hover:underline"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
                {message.whatsapp ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex rounded-full bg-[#25D366] px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    {t("whatsapp")}
                  </a>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-bamboo/10 px-3 py-2">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => pushExchange(t(`topics.${topic}`), topic)}
                className="rounded-full border border-bamboo/25 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-olive/40 hover:text-olive"
              >
                {t(`topics.${topic}`)}
              </button>
            ))}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#25D366] px-2.5 py-1 text-xs font-semibold text-white"
            >
              {t("whatsapp")}
            </a>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-bamboo/15 px-3 py-2.5"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("placeholder")}
              className="min-w-0 flex-1 rounded-xl border border-bamboo/20 bg-cream px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-olive"
              autoComplete="off"
            />
            <button
              type="submit"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-olive text-white transition hover:bg-olive-light"
              aria-label={t("send")}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-olive text-white shadow-[0_8px_24px_-4px_rgba(61,184,168,0.55)] transition hover:scale-105 hover:bg-olive-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
      </button>
    </>
  );
}
