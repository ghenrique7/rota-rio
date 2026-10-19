import { listCidades, listDestinosDe } from "../api.js";
import { formatDateLabel, formatDuration, todayIsoDate } from "../format.js";
import { readLastSearch, saveLastSearch } from "../nav.js";

const DEFAULT_ORIGIN = "Santarém";
const MAX_POPULAR = 3;

const form = document.querySelector("#search-form");
const originSelect = document.querySelector("#origem");
const destinationSelect = document.querySelector("#destino");
const dateInput = document.querySelector("#data");
const dateLabel = document.querySelector("#data-label");
const swapButton = document.querySelector("#trocar");
const submitButton = document.querySelector("#buscar-submit");
const formStatus = document.querySelector("#form-status");
const subtitle = document.querySelector("#subtitle");
const popularList = document.querySelector("#populares");
const popularStatus = document.querySelector("#populares-status");

function fillSelect(select, cities, placeholder) {
  const options = [];
  if (placeholder) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder;
    options.push(empty);
  }
  for (const city of cities) {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    options.push(option);
  }
  select.replaceChildren(...options);
}

function updateDateLabel() {
  dateLabel.textContent = formatDateLabel(dateInput.value);
}

function updateSubmitState() {
  const origin = originSelect.value;
  const destination = destinationSelect.value;
  const same = origin && origin === destination;
  submitButton.disabled = !origin || !destination || same;
  formStatus.textContent = same ? "Origem e destino precisam ser diferentes." : "";
}

async function renderPopular() {
  const origin = originSelect.value;
  popularList.replaceChildren();
  popularStatus.textContent = "Carregando rotas…";

  try {
    const destinations = (await listDestinosDe(origin)).slice(0, MAX_POPULAR);
    popularStatus.textContent = destinations.length
      ? ""
      : "Nenhuma rota cadastrada a partir desta cidade.";

    for (const item of destinations) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "route-card";

      const name = document.createElement("span");
      name.className = "route-card__name";
      name.textContent = `${item.origemCidade} → ${item.destinoCidade}`;

      const duration = document.createElement("span");
      duration.className = "route-card__meta";
      duration.textContent = formatDuration(item.duracaoMinutos);

      button.append(name, duration);
      button.addEventListener("click", () => {
        destinationSelect.value = item.destinoCidade;
        updateSubmitState();
        submitButton.focus();
      });
      li.append(button);
      popularList.append(li);
    }
  } catch {
    popularStatus.textContent = "Não foi possível carregar as rotas populares.";
  }
}

function onOriginChange() {
  subtitle.textContent = `Horários de barcos e lanchas · ${originSelect.value}`;
  updateSubmitState();
  renderPopular();
}

function onSwap() {
  if (!destinationSelect.value) return;
  const origin = originSelect.value;
  originSelect.value = destinationSelect.value;
  destinationSelect.value = origin;
  onOriginChange();
}

function onSubmit(event) {
  event.preventDefault();
  if (submitButton.disabled) return;

  const search = {
    origem: originSelect.value,
    destino: destinationSelect.value,
    data: dateInput.value,
  };
  saveLastSearch(search);
  window.location.href = `horarios.html?${new URLSearchParams(search)}`;
}

async function init() {
  const today = todayIsoDate();
  dateInput.value = today;
  dateInput.min = today;
  updateDateLabel();

  form.addEventListener("submit", onSubmit);
  swapButton.addEventListener("click", onSwap);
  originSelect.addEventListener("change", onOriginChange);
  destinationSelect.addEventListener("change", updateSubmitState);
  dateInput.addEventListener("change", () => {
    if (!dateInput.value) dateInput.value = today;
    updateDateLabel();
  });

  try {
    const cities = await listCidades();
    if (!cities.length) throw new Error("Sem cidades cadastradas.");

    fillSelect(originSelect, cities);
    fillSelect(destinationSelect, cities, "Escolha a cidade");

    const last = readLastSearch();
    originSelect.value = cities.includes(last?.origem)
      ? last.origem
      : cities.includes(DEFAULT_ORIGIN)
        ? DEFAULT_ORIGIN
        : cities[0];

    form.hidden = false;
    document.querySelector("#carregando").hidden = true;
    onOriginChange();

    if (window.location.hash === "#buscar") destinationSelect.focus();
  } catch {
    document.querySelector("#carregando").textContent =
      "Não foi possível carregar as cidades. Verifique sua conexão e tente novamente.";
    popularStatus.textContent = "";
  }
}

init();
