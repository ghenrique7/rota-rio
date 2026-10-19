import { listCidades, listDestinosDe } from "../api.js";
import { formatDuration, todayIsoDate } from "../format.js";
import { readLastSearch } from "../nav.js";

const DEFAULT_ORIGIN = "Santarém";

const params = new URLSearchParams(window.location.search);

const originSelect = document.querySelector("#origem");
const picker = document.querySelector("#seletor");
const subtitle = document.querySelector("#subtitulo");
const count = document.querySelector("#contagem");
const message = document.querySelector("#mensagem");
const list = document.querySelector("#destinos");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function destinationItem(item) {
  const li = el("li");
  const link = el("a", "route-card");
  link.href = `horarios.html?${new URLSearchParams({
    origem: item.origemCidade,
    destino: item.destinoCidade,
    data: todayIsoDate(),
  })}`;

  const text = el("span", "route-card__text");
  text.append(
    el("span", "route-card__name", `${item.origemCidade} → ${item.destinoCidade}`),
    el("span", "route-card__meta", item.destinoNome)
  );
  link.append(text, el("span", "route-card__meta", formatDuration(item.duracaoMinutos)));
  li.append(link);
  return li;
}

async function renderDestinations() {
  const origin = originSelect.value;
  subtitle.textContent = `Saindo de ${origin}`;
  list.replaceChildren();
  count.textContent = "";
  message.textContent = "Carregando destinos…";

  try {
    const destinations = await listDestinosDe(origin);
    if (originSelect.value !== origin) return;

    if (!destinations.length) {
      message.textContent = "Nenhuma rota cadastrada a partir desta cidade.";
      return;
    }
    message.textContent = "";
    count.textContent = `${destinations.length} ${destinations.length === 1 ? "destino" : "destinos"} a partir daqui`;
    list.replaceChildren(...destinations.map(destinationItem));
  } catch {
    message.textContent = "Não foi possível carregar as rotas. Verifique sua conexão e tente novamente.";
  }
}

async function init() {
  try {
    const cities = await listCidades();
    if (!cities.length) throw new Error("Sem cidades cadastradas.");

    const options = cities.map((city) => {
      const option = el("option", "", city);
      option.value = city;
      return option;
    });
    originSelect.replaceChildren(...options);

    const wanted = params.get("origem") ?? readLastSearch()?.origem;
    originSelect.value = cities.includes(wanted)
      ? wanted
      : cities.includes(DEFAULT_ORIGIN)
        ? DEFAULT_ORIGIN
        : cities[0];

    picker.hidden = false;
    originSelect.addEventListener("change", renderDestinations);
    renderDestinations();
  } catch {
    message.textContent = "Não foi possível carregar as cidades. Verifique sua conexão e tente novamente.";
  }
}

init();
