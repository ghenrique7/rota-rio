// Saved interests live only on this device (localStorage), no login.
// Shape: [{ rotaId, embarcacaoId, data, savedAt }]
const INTERESTS_KEY = "riorota_interesses";

function sameTrip(item, rotaId, embarcacaoId, data) {
  return (
    Number(item.rotaId) === Number(rotaId) &&
    Number(item.embarcacaoId) === Number(embarcacaoId) &&
    item.data === data
  );
}

/** Never throws: returns [] if storage is blocked or the content is invalid. */
export function listInterests() {
  try {
    const parsed = JSON.parse(localStorage.getItem(INTERESTS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInterests(items) {
  try {
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function hasInterest(rotaId, embarcacaoId, data) {
  return listInterests().some((item) => sameTrip(item, rotaId, embarcacaoId, data));
}

/** Returns false when the interest could not be saved (e.g. private mode). */
export function addInterest(rotaId, embarcacaoId, data) {
  const items = listInterests();
  if (items.some((item) => sameTrip(item, rotaId, embarcacaoId, data))) return true;
  items.push({ rotaId, embarcacaoId, data, savedAt: new Date().toISOString() });
  return writeInterests(items);
}

export function removeInterest(rotaId, embarcacaoId, data) {
  const items = listInterests().filter((item) => !sameTrip(item, rotaId, embarcacaoId, data));
  return writeInterests(items);
}
