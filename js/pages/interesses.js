import { getViagensByIds } from "../api.js";
import {
  addMinutesToTime,
  formatDateLabel,
  formatDuration,
  formatTime,
  todayIsoDate,
  whatsappUrl,
} from "../format.js";
import { listInterests, removeInterest } from "../storage.js";

const tabsRoot = document.querySelector("#abas");
const message = document.querySelector("#mensagem");
const list = document.querySelector("#interesses");

const EMPTY_TEXT = {
  proximas: "Você ainda não salvou nenhum interesse.",
  historico: "Nenhum interesse no histórico.",
};

let trips = [];
let activeTab = "proximas";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function sortKey(trip) {
  return `${trip.data} ${formatTime(trip.horarioSaida)}`;
}

function tripsForTab() {
  const today = todayIsoDate();
  if (activeTab === "proximas") {
    return trips.filter((trip) => trip.data >= today).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }
  return trips.filter((trip) => trip.data < today).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
}

function interestCard(trip) {
  const li = el("li");
  const card = el("article", "card trip-card");

  const top = el("div", "trip-card__top");
  top.append(
    el("span", "trip-card__type", `${trip.embarcacao.tipo} · ${trip.embarcacao.nome}`),
    el("span", "trip-card__updated", formatDateLabel(trip.data))
  );

  const times = el("div", "trip-card__times");
  const departure = el("div");
  departure.append(el("p", "time", formatTime(trip.horarioSaida)), el("p", "trip-card__label", trip.origem.cidade));
  const arrival = el("div", "trip-card__arrival");
  arrival.append(
    el("p", "time", addMinutesToTime(trip.horarioSaida, trip.duracaoMinutos)),
    el("p", "trip-card__label", trip.destino.cidade)
  );
  times.append(departure, el("p", "trip-card__duration", formatDuration(trip.duracaoMinutos)), arrival);

  const boarding = trip.pontoEmbarque ? `${trip.origem.nome} — ${trip.pontoEmbarque}` : trip.origem.nome;
  const place = el("p", "trip-card__meta", `Embarque: ${boarding}`);
  const note = el(
    "p",
    "interest-note",
    "Interesse salvo neste aparelho. Confirme com o responsável pela viagem."
  );

  const actions = el("div", "interest-actions");
  const details = el("a", "pill btn btn--secondary", "Ver viagem");
  details.href = `viagem.html?${new URLSearchParams({
    rota: trip.rotaId,
    embarcacao: trip.embarcacaoId,
    data: trip.data,
  })}`;
  actions.append(details);

  const contact = trip.embarcacao.contatos[0];
  if (contact) {
    const link = el("a", "pill btn btn--primary btn--inline", "Contato");
    link.href = whatsappUrl(contact.numero_telefone);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    actions.append(link);
  }

  const remove = el("button", "pill btn btn--secondary", "Remover");
  remove.type = "button";
  remove.addEventListener("click", () => {
    removeInterest(trip.rotaId, trip.embarcacaoId, trip.data);
    trips = trips.filter((item) => item !== trip);
    render();
  });
  actions.append(remove);

  card.append(top, times, place, note, actions);
  li.append(card);
  return li;
}

function renderTabs() {
  const defs = [
    ["proximas", "Próximas"],
    ["historico", "Histórico"],
  ];
  const buttons = defs.map(([id, label]) => {
    const button = el("button", "chip", label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(id === activeTab));
    if (id === activeTab) button.classList.add("is-active");
    button.addEventListener("click", () => {
      activeTab = id;
      renderTabs();
      render();
    });
    return button;
  });
  tabsRoot.replaceChildren(...buttons);
}

function render() {
  const items = tripsForTab();
  message.textContent = items.length ? "" : EMPTY_TEXT[activeTab];
  list.replaceChildren(...items.map(interestCard));
}

async function init() {
  renderTabs();
  const saved = listInterests();

  if (!saved.length) {
    render();
    return;
  }

  message.textContent = "Carregando seus interesses…";
  try {
    trips = await getViagensByIds(saved);
  } catch {
    message.textContent = "Não foi possível carregar seus interesses. Verifique sua conexão e tente novamente.";
    return;
  }
  render();
}

init();
