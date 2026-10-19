import { searchViagens } from "../api.js";
import {
  addMinutesToTime,
  formatCurrency,
  formatDateLabel,
  formatDuration,
  formatTime,
  formatUpdatedOn,
} from "../format.js";
import { saveLastSearch } from "../nav.js";

const params = new URLSearchParams(window.location.search);
const origem = params.get("origem");
const destino = params.get("destino");
const data = params.get("data");

const route = document.querySelector("#rota");
const summary = document.querySelector("#resumo");
const chipsRoot = document.querySelector("#chips");
const content = document.querySelector("#conteudo");
const message = document.querySelector("#mensagem");
const list = document.querySelector("#viagens");

let allTrips = [];
let activeType = "Todos";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showMessage(text, linkLabel, linkHref) {
  message.replaceChildren(el("p", "status", text));
  if (linkLabel) {
    const link = el("a", "pill btn btn--primary btn--inline", linkLabel);
    link.href = linkHref;
    message.append(link);
  }
  message.hidden = false;
  list.replaceChildren();
  chipsRoot.replaceChildren();
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

function tripCard(trip) {
  const li = el("li");
  const card = el("article", "card trip-card");

  const top = el("div", "trip-card__top");
  top.append(
    el("span", "trip-card__type", trip.embarcacao.tipo),
    el("span", "trip-card__updated", formatUpdatedOn(trip.atualizadoEm))
  );

  const times = el("div", "trip-card__times");
  const departure = el("div");
  departure.append(el("p", "time", formatTime(trip.horarioSaida)), el("p", "trip-card__label", "Saída"));
  const duration = el("p", "trip-card__duration", formatDuration(trip.duracaoMinutos));
  const arrival = el("div", "trip-card__arrival");
  arrival.append(
    el("p", "time", addMinutesToTime(trip.horarioSaida, trip.duracaoMinutos)),
    el("p", "trip-card__label", "Chegada")
  );
  times.append(departure, duration, arrival);

  const boat = el("p", "trip-card__boat", trip.embarcacao.nome);
  const port = el("p", "trip-card__meta", `Sai de: ${trip.origem.nome}`);

  const bottom = el("div", "trip-card__bottom");
  bottom.append(el("span", "trip-card__fee", formatCurrency(trip.valorTaxa)));
  const link = el("a", "pill btn btn--primary btn--inline", "Ver viagem");
  link.href = `viagem.html?${new URLSearchParams({
    rota: trip.rotaId,
    embarcacao: trip.embarcacaoId,
    data,
  })}`;
  bottom.append(link);

  card.append(top, times, boat, port, bottom);
  li.append(card);
  return li;
}

function visibleTrips() {
  return activeType === "Todos"
    ? allTrips
    : allTrips.filter((trip) => trip.embarcacao.tipo === activeType);
}

function render() {
  const trips = visibleTrips();
  summary.textContent = `${formatDateLabel(data)} · ${trips.length} ${trips.length === 1 ? "saída" : "saídas"}`;
  list.replaceChildren(...trips.map(tripCard));
}

function renderChips() {
  const types = ["Todos", ...new Set(allTrips.map((trip) => trip.embarcacao.tipo))];
  const buttons = types.map((type) => {
    const button = el("button", "chip", type);
    button.type = "button";
    button.setAttribute("aria-pressed", String(type === activeType));
    if (type === activeType) button.classList.add("is-active");
    button.addEventListener("click", () => {
      activeType = type;
      renderChips();
      render();
    });
    return button;
  });
  chipsRoot.replaceChildren(...buttons);
}

async function init() {
  if (!origem || !destino || !isValidDate(data)) {
    route.textContent = "Horários";
    showMessage("Faça uma busca para ver os horários.", "Ir para o início", "index.html");
    return;
  }

  route.textContent = `${origem} → ${destino}`;
  summary.textContent = formatDateLabel(data);
  saveLastSearch({ origem, destino, data });
  content.hidden = false;
  message.replaceChildren(el("p", "status", "Carregando saídas…"));
  message.hidden = false;

  try {
    allTrips = await searchViagens({ origem, destino, data });
  } catch {
    showMessage(
      "Não foi possível carregar os horários. Verifique sua conexão e tente novamente.",
      "Tentar de novo",
      window.location.href
    );
    return;
  }

  if (!allTrips.length) {
    showMessage("Nenhuma saída encontrada para essa data. Tente outro dia.", "Alterar busca", "index.html#buscar");
    summary.textContent = `${formatDateLabel(data)} · 0 saídas`;
    return;
  }

  message.hidden = true;
  renderChips();
  render();
}

init();
