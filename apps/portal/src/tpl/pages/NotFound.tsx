import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { PageHeader } from "../ui/blocks";

export function NotFoundPage() {
  const { lang, url } = usePage();
  const pl = lang === "pl";
  const title = pl ? "Nie ma takiej strony" : "Page not found";
  useMeta(title, [{ label: title }]);
  return (
    <>
      <PageHeader
        title={title}
        lead={pl ? `Adres ${url.pathname} nie prowadzi do żadnej strony.` : `${url.pathname} does not lead to a page.`}
      />
      <p>
        <Link to="/">{pl ? "Przejdź do przeglądu" : "Go to the overview"}</Link>{" "}
        {pl ? "albo użyj wyszukiwania (Ctrl K)." : "or use search (Ctrl K)."}
      </p>
    </>
  );
}
