// Star button: adds an item to Ulubione (favourites) or removes it.

import type { Lang } from "../../i18n";
import { toggleFavourite, type Personal } from "../personal";
import { usePersonal } from "../usePersonal";
import { Icon } from "./icons";

export function FavButton({ item, lang }: { item: Personal; lang: Lang }) {
  const pl = lang === "pl";
  const { favourites } = usePersonal();
  const on = favourites.some((f) => f.id === item.id);
  return (
    <button
      type="button"
      className={`zt-btn zt-btn--icon t-fav${on ? " t-fav--on" : ""}`}
      aria-pressed={on}
      aria-label={`${pl ? "Ulubione" : "Favourite"}: ${item.label}`}
      title={on ? (pl ? "Usuń z ulubionych" : "Remove from favourites") : pl ? "Dodaj do ulubionych" : "Add to favourites"}
      onClick={() => toggleFavourite(item)}
    >
      <Icon name="star" size={16} />
    </button>
  );
}
