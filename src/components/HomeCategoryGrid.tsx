import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { isUploadedProductImage } from "@/lib/image-utils";
import { localePath } from "@/lib/seo";
import { getProductImages, type Category, type Product } from "@/lib/types";

const CATEGORY_ORDER = ["girls", "boys", "baby", "unisex", "outfits"];

type Props = {
  categories: Category[];
  products: Product[];
  locale: string;
};

function coverScore(product: Product): number {
  const name = `${product.nameTr} ${product.nameEn}`.toLocaleLowerCase("tr");
  let score = product.inStock ? 10 : 0;
  if (/boxer|atlet|külot|kulot/.test(name)) score -= 40;
  if (/takım|takim|elbise|sweat|eşofman|esofman|ceket|jean/.test(name)) {
    score += 20;
  }
  return score;
}

function coverImage(products: Product[], slug: string): string | null {
  const matches = products.filter((product) => getProductImages(product)[0]);
  const ranked = matches
    .filter((product) => product.category === slug)
    .sort((a, b) => coverScore(b) - coverScore(a));
  const preferred = ranked[0];
  if (!preferred) return null;
  return getProductImages(preferred)[0] ?? null;
}

export async function HomeCategoryGrid({
  categories,
  products,
  locale,
}: Props) {
  const t = await getTranslations("footer");
  const base = localePath(locale);
  const labelFor = (category: Category) => {
    if (category.slug === "girls") return t("categoryGirls");
    if (category.slug === "boys") return t("categoryBoys");
    if (category.slug === "baby") return t("categoryBaby");
    return locale === "en" ? category.nameEn : category.nameTr;
  };

  const tiles = [...categories]
    .map((category) => ({
      category,
      label: labelFor(category),
      image: coverImage(products, category.slug),
    }))
    .filter((tile) => tile.image)
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category.slug);
      const bi = CATEGORY_ORDER.indexOf(b.category.slug);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  if (tiles.length === 0) return null;

  return (
    <nav aria-label={t("shop")} className="mb-12 sm:mb-16">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-8">
        {tiles.map((tile) => (
          <li key={tile.category.slug}>
            <Link
              href={`${base}/kategori/${tile.category.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-cream-dark">
                <Image
                  src={tile.image!}
                  alt={tile.label}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  unoptimized={isUploadedProductImage(tile.image!)}
                  className="object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <p className="mt-3 text-center text-[15px] font-medium text-slate-800 sm:text-base">
                {tile.label}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
