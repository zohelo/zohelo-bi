// STUB: replaced by the full page. Keeps the route alive while the page is built.
import { useMeta, usePage } from "../context";
import { PageHeader } from "../ui/blocks";

export function CataloguePage() {
  const { lang } = usePage();
  const title = lang === "pl" ? "Katalog wskaźników" : "Indicator catalogue";
  useMeta(title, [{ label: title }]);
  return (
    <>
      <PageHeader title={title} />
      <p className="t-stub">{lang === "pl" ? "Ta strona jest w budowie." : "This page is being built."}</p>
    </>
  );
}
