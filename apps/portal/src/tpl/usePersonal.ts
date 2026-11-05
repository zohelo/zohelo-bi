// Re-render when the reader's personal state changes (favourites, role, design variants) in this or another
// component.

import { useEffect, useState } from "react";
import { loadFavourites, loadRole, PERSONAL_EVENT, type Personal, type Role } from "./personal";
import { loadVariants, type Variants } from "./variants";

export function usePersonal(): { favourites: Personal[]; role: Role; variants: Variants } {
  const [state, setState] = useState(() => ({ favourites: loadFavourites(), role: loadRole(), variants: loadVariants() }));
  useEffect(() => {
    const on = () => setState({ favourites: loadFavourites(), role: loadRole(), variants: loadVariants() });
    window.addEventListener(PERSONAL_EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(PERSONAL_EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return state;
}
