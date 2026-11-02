import { t, type Lang } from "../i18n";
import { Link } from "../router";

export function NotFound({ path, lang }: { path: string; lang: Lang }) {
  return (
    <div className="page">
      <div className="page-head">
        <h1>{t(lang, "notFound.title")}</h1>
        <p className="lede">
          {t(lang, "notFound.nothingAt")} <code>{path}</code>.
        </p>
      </div>
      <p>
        <Link to="/">{t(lang, "notFound.goToDashboard")}</Link> ·{" "}
        <Link to="/catalogue">{t(lang, "notFound.browseCatalogue")}</Link>
      </p>
    </div>
  );
}
