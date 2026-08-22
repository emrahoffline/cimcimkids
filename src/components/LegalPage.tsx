import type { ReactNode } from "react";

type Section = { title?: string; text: string };

export function LegalPage({
  title,
  updated,
  intro,
  lead,
  sections,
}: {
  title: string;
  updated?: string;
  intro?: string;
  lead?: ReactNode;
  sections: Section[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-semibold sm:text-4xl">{title}</h1>
      {updated && (
        <p className="mb-6 text-sm text-olive/50">{updated}</p>
      )}
      {intro && <p className="mb-6 text-lg text-olive/80">{intro}</p>}
      {lead && <div className="card mb-6 space-y-1 text-sm text-olive/80">{lead}</div>}
      <div className="prose-page card">
        {sections.map((s, i) => (
          <div key={i}>
            {s.title && <h2>{s.title}</h2>}
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
