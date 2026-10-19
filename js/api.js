import { weekdayFromIsoDate } from "./format.js";
import { supabase } from "./supabase.js";

const ROTA_SELECT = `
  id, horario_saida, duracao_minutos, valor_taxa, ponto_embarque, atualizado_em, dias_semana,
  origem:porto!rota_porto_origem_id_fkey!inner ( id, nome, cidade, endereco, latitude, longitude ),
  destino:porto!rota_porto_destino_id_fkey!inner ( id, nome, cidade, latitude, longitude ),
  embarcacao_rota (
    embarcacao (
      id, nome, tipo, capacidade, comodidades,
      contato ( id, numero_telefone, valor )
    )
  )
`;

function throwIfError(error) {
  if (error) throw error;
}

function toTrip(rotaRow, boat) {
  return {
    rotaId: rotaRow.id,
    embarcacaoId: boat.id,
    horarioSaida: rotaRow.horario_saida,
    duracaoMinutos: rotaRow.duracao_minutos,
    valorTaxa: rotaRow.valor_taxa,
    pontoEmbarque: rotaRow.ponto_embarque,
    atualizadoEm: rotaRow.atualizado_em,
    diasSemana: rotaRow.dias_semana,
    origem: rotaRow.origem,
    destino: rotaRow.destino,
    embarcacao: {
      id: boat.id,
      nome: boat.nome,
      tipo: boat.tipo,
      capacidade: boat.capacidade,
      comodidades: boat.comodidades ?? [],
      contatos: boat.contato ?? [],
    },
  };
}

/** One card = one route × one boat. */
function flattenViagens(rows) {
  const trips = [];
  for (const row of rows ?? []) {
    for (const link of row.embarcacao_rota ?? []) {
      if (link.embarcacao) trips.push(toTrip(row, link.embarcacao));
    }
  }
  return trips;
}

export async function listCidades() {
  const { data, error } = await supabase.from("porto").select("cidade");
  throwIfError(error);

  const unique = [...new Set((data ?? []).map((row) => row.cidade).filter(Boolean))];
  unique.sort((a, b) => a.localeCompare(b, "pt-BR"));
  return unique;
}

export async function searchViagens({ origem, destino, data, tipo } = {}) {
  const weekday = weekdayFromIsoDate(data);

  const { data: rows, error } = await supabase
    .from("rota")
    .select(ROTA_SELECT)
    .eq("origem.cidade", origem)
    .eq("destino.cidade", destino)
    .contains("dias_semana", [weekday])
    .order("horario_saida");

  throwIfError(error);

  let trips = flattenViagens(rows);
  if (tipo && tipo !== "Todos") {
    trips = trips.filter((trip) => trip.embarcacao.tipo === tipo);
  }
  return trips;
}

export async function getViagem(rotaId, embarcacaoId) {
  const { data: row, error } = await supabase
    .from("rota")
    .select(ROTA_SELECT)
    .eq("id", rotaId)
    .maybeSingle();

  throwIfError(error);
  if (!row) {
    throw new Error("Viagem não encontrada.");
  }

  const boat = (row.embarcacao_rota ?? [])
    .map((link) => link.embarcacao)
    .find((item) => item && Number(item.id) === Number(embarcacaoId));

  if (!boat) {
    throw new Error("Embarcação não encontrada nesta rota.");
  }

  return toTrip(row, boat);
}

export async function listDestinosDe(cidade) {
  const { data: rows, error } = await supabase
    .from("rota")
    .select(
      `
      duracao_minutos,
      origem:porto!rota_porto_origem_id_fkey!inner ( cidade ),
      destino:porto!rota_porto_destino_id_fkey!inner ( id, nome, cidade )
    `
    )
    .eq("origem.cidade", cidade);

  throwIfError(error);

  const shortestByCity = new Map();
  for (const row of rows ?? []) {
    const destinoCidade = row.destino?.cidade;
    if (!destinoCidade) continue;
    const current = shortestByCity.get(destinoCidade);
    if (!current || row.duracao_minutos < current.duracaoMinutos) {
      shortestByCity.set(destinoCidade, {
        origemCidade: cidade,
        destinoCidade,
        destinoNome: row.destino.nome,
        duracaoMinutos: row.duracao_minutos,
      });
    }
  }

  return [...shortestByCity.values()].sort((a, b) => a.duracaoMinutos - b.duracaoMinutos);
}

export async function getViagensByIds(items) {
  if (!items?.length) return [];

  const rotaIds = [...new Set(items.map((item) => item.rotaId))];
  const { data: rows, error } = await supabase
    .from("rota")
    .select(ROTA_SELECT)
    .in("id", rotaIds);

  throwIfError(error);

  const trips = flattenViagens(rows);
  const byKey = new Map(trips.map((trip) => [`${trip.rotaId}:${trip.embarcacaoId}`, trip]));

  return items
    .map((item) => {
      const trip = byKey.get(`${item.rotaId}:${item.embarcacaoId}`);
      if (!trip) return null;
      return { ...trip, data: item.data, savedAt: item.savedAt };
    })
    .filter(Boolean);
}
