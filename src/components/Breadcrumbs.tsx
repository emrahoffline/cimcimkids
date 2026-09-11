import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden className="text-slate-300">
                  /
                </span>
              )}
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-bamboo">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "text-slate-700" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
