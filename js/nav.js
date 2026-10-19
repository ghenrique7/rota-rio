const LAST_SEARCH_KEY = "riorota_ultima_busca";

const ICONS = {
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke-width="1.8"/><path stroke-width="1.8" stroke-linecap="round" d="m16 16 4 4"/></svg>`,
  map: `<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m8 5 8-2v16l-8 2zM8 5v16M16 3v16M4 8l4-1M20 6l-4-1"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke-width="1.8" stroke-linejoin="round" d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z"/></svg>`,
};

export function saveLastSearch(search) {
  try {
    localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(search));
  } catch {
    // Private mode: the app still works; Buscar falls back to Início.
  }
}

export function readLastSearch() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_SEARCH_KEY));
    if (!parsed?.origem || !parsed?.destino || !parsed?.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buscarHref() {
  const last = readLastSearch();
  if (!last) return "index.html#buscar";
  const params = new URLSearchParams({
    origem: last.origem,
    destino: last.destino,
    data: last.data,
  });
  return `horarios.html?${params}`;
}

export function renderNav(activeId) {
  const root = document.querySelector("#nav-root");
  if (!root) return;

  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.setAttribute("aria-label", "Principal");

  const items = [
    { id: "inicio", href: "index.html", label: "Início", icon: ICONS.home },
    { id: "buscar", href: buscarHref(), label: "Buscar", icon: ICONS.search },
    { id: "rotas", href: "rotas.html", label: "Rotas", icon: ICONS.map },
    { id: "interesses", href: "interesses.html", label: "Interesses", icon: ICONS.bookmark },
  ];

  for (const item of items) {
    const link = document.createElement("a");
    link.className = "nav__item";
    link.href = item.href;

    if (item.id === activeId) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }

    const icon = document.createElement("span");
    icon.className = "nav__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = item.icon;

    const label = document.createElement("span");
    label.className = "nav__label";
    label.textContent = item.label;

    link.append(icon, label);
    nav.append(link);
  }

  root.replaceChildren(nav);
}
