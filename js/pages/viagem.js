import { getViagem } from "../api.js";
import {
  addMinutesToTime,
  formatCurrency,
  formatDateLabel,
  formatDuration,
  formatTime,
  formatUpdatedOn,
  telUrl,
  todayIsoDate,
  whatsappUrl,
} from "../format.js";
import { addInterest, hasInterest, removeInterest } from "../storage.js";

const AMENITY_LABELS = {
  poltrona: "Poltrona",
  wifi: "Wi-Fi",
  lanchonete: "Lanchonete",
  colete: "Colete salva-vidas",
};

const params = new URLSearchParams(window.location.search);
const rotaId = Number(params.get("rota"));
const embarcacaoId = Number(params.get("embarcacao"));
const rawDate = params.get("data");
const data = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? "") ? rawDate : todayIsoDate();

const message = document.querySelector("#mensagem");
const details = document.querySelector("#detalhes");
const backLink = document.querySelector("#voltar");

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
  details.hidden = true;
}

function card(title) {
  const section = el("section", "card detail-card");
  section.append(el("h2", "detail-card__title", title));
  return section;
}

function row(label, value) {
  const wrapper = el("p", "detail-row");
  wrapper.append(el("span", "detail-row__label", label), el("span", "detail-row__value", value));
  return wrapper;
}

function heroCard(trip) {
  const hero = el("section", "card hero");
  hero.append(
    el("p", "hero__boat", `${trip.embarcacao.tipo} · ${trip.embarcacao.nome}`),
    el("p", "trip-card__updated", `${formatDateLabel(data)} · ${formatUpdatedOn(trip.atualizadoEm)}`)
  );

  const times = el("div", "trip-card__times");
  const departure = el("div");
  departure.append(el("p", "time", formatTime(trip.horarioSaida)), el("p", "trip-card__label", trip.origem.cidade));
  const middle = el("p", "trip-card__duration", `${formatDuration(trip.duracaoMinutos)} · direto`);
  const arrival = el("div", "trip-card__arrival");
  arrival.append(
    el("p", "time", addMinutesToTime(trip.horarioSaida, trip.duracaoMinutos)),
    el("p", "trip-card__label", trip.destino.cidade)
  );
  times.append(departure, middle, arrival);
  hero.append(times);
  return hero;
}

function boardingCard(trip) {
  const section = card("Ponto de embarque");
  const place = trip.pontoEmbarque ? `${trip.origem.nome} — ${trip.pontoEmbarque}` : trip.origem.nome;
  section.append(el("p", "detail-strong", place));
  if (trip.origem.endereco) section.append(el("p", "trip-card__meta", trip.origem.endereco));
  return section;
}

function contactsCard(trip) {
  const section = card("Contato do responsável");
  const contacts = trip.embarcacao.contatos;

  if (!contacts.length) {
    section.append(el("p", "status", "Nenhum contato cadastrado para esta embarcação."));
    return section;
  }

  const list = el("ul", "contact-list");
  for (const contact of contacts) {
    const item = el("li", "contact");
    const info = el("div");
    info.append(
      el("p", "detail-strong", contact.valor || "Contato"),
      el("p", "trip-card__meta", contact.numero_telefone)
    );

    const actions = el("div", "contact__actions");
    const call = el("a", "pill btn btn--secondary", "Ligar");
    call.href = telUrl(contact.numero_telefone);
    call.setAttribute("aria-label", `Ligar para ${contact.valor || "contato"}`);
    const whats = el("a", "pill btn btn--primary btn--inline", "WhatsApp");
    whats.href = whatsappUrl(contact.numero_telefone);
    whats.target = "_blank";
    whats.rel = "noopener noreferrer";
    whats.setAttribute("aria-label", `WhatsApp de ${contact.valor || "contato"}`);
    actions.append(call, whats);

    item.append(info, actions);
    list.append(item);
  }
  section.append(list);
  return section;
}

function amenitiesCard(trip) {
  const section = card("Comodidades");
  const { comodidades, capacidade } = trip.embarcacao;

  if (comodidades.length) {
    const list = el("ul", "amenity-list");
    for (const key of comodidades) {
      list.append(el("li", "amenity", AMENITY_LABELS[key] ?? key));
    }
    section.append(list);
  } else {
    section.append(el("p", "status", "Sem comodidades informadas."));
  }
  if (capacidade) section.append(el("p", "trip-card__meta", `Capacidade: ${capacidade} pessoas`));
  return section;
}

function interestBar(trip) {
  const bar = el("div", "action-bar");

  const price = el("div");
  price.append(
    el("p", "trip-card__label", "Valor informativo da viagem"),
    el("p", "trip-card__fee", formatCurrency(trip.valorTaxa))
  );

  const button = el("button", "pill btn btn--primary btn--inline");
  button.type = "button";
  const note = el("p", "interest-note");
  note.setAttribute("role", "status");

  function refresh(failed = false) {
    const saved = hasInterest(trip.rotaId, trip.embarcacaoId, data);
    button.textContent = saved ? "Interesse salvo" : "Avisar interesse";
    button.setAttribute("aria-pressed", String(saved));
    if (failed) {
      note.textContent = "Não foi possível salvar neste aparelho (armazenamento bloqueado).";
    } else {
      note.textContent = saved
        ? "Interesse salvo neste aparelho. Confirme com o responsável pela viagem."
        : "";
    }
  }

  button.addEventListener("click", () => {
    const saved = hasInterest(trip.rotaId, trip.embarcacaoId, data);
    const ok = saved
      ? removeInterest(trip.rotaId, trip.embarcacaoId, data)
      : addInterest(trip.rotaId, trip.embarcacaoId, data);
    refresh(!ok);
  });

  refresh();
  const row = el("div", "action-bar__row");
  row.append(price, button);
  bar.append(row, note);
  return bar;
}

async function init() {
  if (!Number.isInteger(rotaId) || rotaId <= 0 || !Number.isInteger(embarcacaoId) || embarcacaoId <= 0) {
    showMessage("Viagem não encontrada. Faça uma busca para escolher uma viagem.", "Ir para o início", "index.html");
    return;
  }

  message.replaceChildren(el("p", "status", "Carregando viagem…"));
  message.hidden = false;

  let trip;
  try {
    trip = await getViagem(rotaId, embarcacaoId);
  } catch (error) {
    const notFound = /não encontrad/i.test(error?.message ?? "");
    showMessage(
      notFound
        ? "Viagem não encontrada. Ela pode ter sido removida ou o link está incorreto."
        : "Não foi possível carregar a viagem. Verifique sua conexão e tente novamente.",
      notFound ? "Ir para o início" : "Tentar de novo",
      notFound ? "index.html" : window.location.href
    );
    return;
  }

  backLink.href = `horarios.html?${new URLSearchParams({
    origem: trip.origem.cidade,
    destino: trip.destino.cidade,
    data,
  })}`;

  const disclaimer = el(
    "p",
    "disclaimer",
    "Horários ilustrativos — confirme antes de ir. Podem mudar com o nível do rio, clima e rodízio das agências."
  );

  details.replaceChildren(
    heroCard(trip),
    boardingCard(trip),
    contactsCard(trip),
    amenitiesCard(trip),
    disclaimer,
    interestBar(trip)
  );
  message.hidden = true;
  details.hidden = false;
}

init();
