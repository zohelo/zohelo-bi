import { Link } from "../router";

export function NotFound({ path }: { path: string }) {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Page not found</h1>
        <p className="lede">
          Nothing lives at <code>{path}</code>.
        </p>
      </div>
      <p>
        <Link to="/">Go to the dashboard</Link> · <Link to="/catalogue">Browse the catalogue</Link>
      </p>
    </div>
  );
}
