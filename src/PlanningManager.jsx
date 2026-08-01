import { useMemo, useState } from "react";
import logoAfdp from "./assets/logo-afdp.png";

const DEFAULT_START_TIME = "09:30";
const LUNCH_START = 12 * 60;
const LUNCH_END = 14 * 60;
const DEFAULT_DURATIONS = {
  kata: 10,
  randori: 15,
  juRandori: 15,
};
const EVENT_ORDER = ["kata0", "kata1", "kata2", "randori", "juRandori1", "juRandori2"];
const EVENT_LABELS = {
  kata0: "Kata 0",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
};

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function parseTime(time) {
  const [hours, minutes] = String(time || DEFAULT_START_TIME)
    .split(":")
    .map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return parseTime(DEFAULT_START_TIME);
  }

  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const minutesInDay = 24 * 60;
  const normalized = ((Math.round(totalMinutes) % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;

  if (!hours) return `${remaining} min`;
  if (!remaining) return `${hours} h`;
  return `${hours} h ${remaining} min`;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeEvent(value) {
  const event = normalizeText(value);

  if (event.includes("ju") && event.includes("randori")) return "juRandori";
  if (event.includes("randori")) return "randori";
  return "kata";
}

function getEventKey(pool) {
  const rawEvent = pool.epreuve || pool.epreuveLabel || pool.type;
  const event = normalizeText(rawEvent);

  if (event.includes("kata0") || event.includes("kata 0") || event.includes("shihotai")) return "kata0";
  if (event.includes("kata1") || event.includes("kata 1")) return "kata1";
  if (event.includes("kata2") || event.includes("kata 2")) return "kata2";
  if (event.includes("jurandori1") || event.includes("ju randori 1")) return "juRandori1";
  if (event.includes("jurandori2") || event.includes("ju randori 2")) return "juRandori2";
  if (event.includes("randori")) return "randori";
  return "kata2";
}

function getPoolDuration(pool, durations) {
  return durations[normalizeEvent(pool.epreuve || pool.epreuveLabel || pool.type)] || DEFAULT_DURATIONS.kata;
}

function getPoolLabel(pool, categories) {
  const category = categories.find((item) => String(item.id) === String(pool.categoryId));
  return pool.nom || category?.nom || pool.epreuveLabel || "Poule";
}

function getCompetitorCount(pool, categories) {
  if (Array.isArray(pool.competitorIds)) return pool.competitorIds.length;
  const category = categories.find((item) => String(item.id) === String(pool.categoryId));
  return category?.competitorIds?.length || 0;
}

function getOrderRank(pool) {
  const eventKey = getEventKey(pool);
  const rank = EVENT_ORDER.indexOf(eventKey);
  return rank === -1 ? EVENT_ORDER.length : rank;
}

function getNextAuthorizedStart(availableAt) {
  if (availableAt >= LUNCH_START && availableAt < LUNCH_END) return LUNCH_END;
  return availableAt;
}

function schedulePools(pools, categories, settings) {
  const startMinutes = parseTime(settings.startTime);
  const tatamis = Array.from({ length: settings.tatamiCount }, (_, index) => ({
    index: index + 1,
    availableAt: getNextAuthorizedStart(startMinutes),
  }));

  return [...pools]
    .map((pool, order) => ({ pool, order, duration: getPoolDuration(pool, settings.durations) }))
    .sort((a, b) => getOrderRank(a.pool) - getOrderRank(b.pool) || a.order - b.order)
    .map(({ pool, duration }, passageOrder) => {
      tatamis.sort((a, b) => a.availableAt - b.availableAt || a.index - b.index);
      const tatami = tatamis[0];
      const start = getNextAuthorizedStart(tatami.availableAt);
      const end = start + duration;
      tatami.availableAt = end > LUNCH_START && start < LUNCH_START ? Math.max(end, LUNCH_END) : end;

      return {
        id: pool.id || `${pool.categoryId || "pool"}-${passageOrder}`,
        pool,
        label: getPoolLabel(pool, categories),
        epreuveKey: getEventKey(pool),
        epreuveLabel: pool.epreuveLabel || EVENT_LABELS[getEventKey(pool)] || pool.epreuve || "Épreuve",
        tatami: tatami.index,
        start,
        end,
        duration,
        passageOrder: passageOrder + 1,
        competitorCount: getCompetitorCount(pool, categories),
      };
    })
    .sort((a, b) => a.start - b.start || a.tatami - b.tatami || a.passageOrder - b.passageOrder);
}

function buildStats(scheduled, categories, settings = {}) {
  const categoryIds = new Set(categories.map((category) => category.id));
  scheduled.forEach((item) => {
    if (item.pool.categoryId) categoryIds.add(item.pool.categoryId);
  });

  const competitorIds = new Set();
  scheduled.forEach((item) => {
    (item.pool.competitorIds || []).forEach((id) => competitorIds.add(id));
  });

  const totalDuration = scheduled.reduce((total, item) => total + item.duration, 0);
  const beforeLunch = scheduled.reduce((total, item) => total + Math.max(0, Math.min(item.end, LUNCH_START) - item.start), 0);
  const afterLunch = scheduled.reduce((total, item) => total + Math.max(0, item.end - Math.max(item.start, LUNCH_END)), 0);
  const endTime = scheduled.reduce((latest, item) => Math.max(latest, item.end), parseTime(settings.startTime || DEFAULT_START_TIME));

  return {
    categoryCount: categoryIds.size,
    poolCount: scheduled.length,
    competitorCount: competitorIds.size,
    tatamiCount: settings.tatamiCount || 1,
    totalDuration,
    beforeLunch,
    afterLunch,
    endTime,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function PlanningManager({ competition = {} }) {
  const pools = competition.pools || [];
  const categories = competition.categories || [];
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [tatamiCount, setTatamiCount] = useState(2);
  const [durations, setDurations] = useState(DEFAULT_DURATIONS);

  const settings = useMemo(
    () => ({
      startTime,
      tatamiCount: clampNumber(tatamiCount, 1, 8, 2),
      durations: {
        kata: clampNumber(durations.kata, 1, 180, DEFAULT_DURATIONS.kata),
        randori: clampNumber(durations.randori, 1, 180, DEFAULT_DURATIONS.randori),
        juRandori: clampNumber(durations.juRandori, 1, 180, DEFAULT_DURATIONS.juRandori),
      },
    }),
    [durations, startTime, tatamiCount]
  );

  const scheduled = useMemo(() => schedulePools(pools, categories, settings), [categories, pools, settings]);
  const stats = useMemo(() => buildStats(scheduled, categories, settings), [categories, scheduled, settings]);
  const groupedByTatami = useMemo(
    () => Array.from({ length: settings.tatamiCount }, (_, index) => scheduled.filter((item) => item.tatami === index + 1)),
    [scheduled, settings.tatamiCount]
  );

  function updateDuration(key, value) {
    setDurations((current) => ({ ...current, [key]: value }));
  }

  function exportPdf() {
    const rows = scheduled
      .map(
        (item) => `<tr><td>${item.passageOrder}</td><td>${formatTime(item.start)}</td><td>${formatTime(item.end)}</td><td>Tatami ${item.tatami}</td><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.epreuveLabel)}</td><td>${item.competitorCount}</td></tr>`
      )
      .join("");
    const popup = window.open("", "_blank");
    if (!popup) return;

    popup.document.write(`<!doctype html><html><head><title>Planning compétition</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#172033}header{display:flex;gap:16px;align-items:center;border-bottom:2px solid #d71920;padding-bottom:16px}img{width:90px;object-fit:contain}.meta{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px;margin:24px 0}.card{border:1px solid #ddd;border-radius:10px;padding:10px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f5f7}.pause{background:#fff3cd;border:1px solid #f3d27a;border-radius:10px;padding:12px;margin:16px 0;text-align:center}@media print{button{display:none}}</style></head><body><header><img src="${logoAfdp}" alt="Logo AFDP"><div><h1>${escapeHtml(competition.nom || "Planning compétition")}</h1><p>${escapeHtml(competition.lieu || "Lieu à définir")} · ${escapeHtml(competition.date || "Date à définir")}</p></div></header><section class="meta"><div class="card"><strong>Heure de début</strong><br>${formatTime(parseTime(settings.startTime))}</div><div class="card"><strong>Heure de fin estimée</strong><br>${formatTime(stats.endTime)}</div><div class="card"><strong>Nombre de tatamis</strong><br>${settings.tatamiCount}</div><div class="card"><strong>Pause déjeuner</strong><br>12h00 → 14h00</div></section><div class="pause"><strong>PAUSE MÉRIDIENNE</strong><br>12h00 → 14h00</div><table><thead><tr><th>Ordre</th><th>Début</th><th>Fin</th><th>Tatami</th><th>Poule</th><th>Épreuve</th><th>Compétiteurs</th></tr></thead><tbody>${rows}</tbody></table><script>window.print();</script></body></html>`);
    popup.document.close();
  }

  return (
    <section className="planning-manager">
      <div className="section-title">
        <p className="surtitle">Planning intelligent</p>
        <h2>Assistant d'organisation Nanbudo</h2>
        <p>Configure les paramètres, puis laisse l'assistant recalculer l'ordre, les tatamis et les horaires optimisés.</p>
      </div>

      <div className="action-grid">
        <label className="action-card">Heure de début<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
        <label className="action-card">Nombre de tatamis<select value={tatamiCount} onChange={(event) => setTatamiCount(event.target.value)}>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} tatami{index > 0 ? "s" : ""}</option>)}</select></label>
        <label className="action-card">Durée Kata<input type="number" min="1" max="180" value={durations.kata} onChange={(event) => updateDuration("kata", event.target.value)} /><small>minutes par poule</small></label>
        <label className="action-card">Durée Randori<input type="number" min="1" max="180" value={durations.randori} onChange={(event) => updateDuration("randori", event.target.value)} /><small>minutes par poule</small></label>
        <label className="action-card">Durée Ju Randori<input type="number" min="1" max="180" value={durations.juRandori} onChange={(event) => updateDuration("juRandori", event.target.value)} /><small>minutes par poule</small></label>
        <button className="action-card" type="button" onClick={exportPdf}>Exporter PDF</button>
      </div>

      <div className="dashboard">
        <div className="card"><span className="number">{formatTime(stats.endTime)}</span><h3>Fin prévisionnelle</h3><p>Depuis {formatTime(parseTime(settings.startTime))}</p></div>
        <div className="card"><span className="number">{stats.competitorCount}</span><h3>Compétiteurs</h3><p>Engagés en poules</p></div>
        <div className="card"><span className="number">{stats.categoryCount}</span><h3>Catégories</h3><p>Total</p></div>
        <div className="card"><span className="number">{stats.poolCount}</span><h3>Poules</h3><p>Planifiées</p></div>
        <div className="card"><span className="number">{stats.tatamiCount}</span><h3>Tatamis</h3><p>Utilisés</p></div>
        <div className="card"><span className="number">{formatDuration(stats.totalDuration)}</span><h3>Durée totale</h3><p>Temps de passage</p></div>
        <div className="card"><span className="number">{formatDuration(stats.beforeLunch)}</span><h3>Avant pause</h3><p>Jusqu'à 12h00</p></div>
        <div className="card"><span className="number">{formatDuration(stats.afterLunch)}</span><h3>Après pause</h3><p>À partir de 14h00</p></div>
      </div>

      <div className="competition-card" style={{ textAlign: "center", borderStyle: "dashed" }}>
        <h3>PAUSE MÉRIDIENNE</h3>
        <p>12h00 → 14h00</p>
        <small>Aucune catégorie ne démarre pendant cette période. Une catégorie lancée avant midi se termine normalement.</small>
      </div>

      <div className="competition-list">
        {scheduled.length === 0 ? (
          <article className="competition-card">
            <h3>Aucune poule à planifier</h3>
            <p>Crée des poules pour générer automatiquement le planning.</p>
          </article>
        ) : (
          groupedByTatami.map((tatamiItems, index) => (
            <article className="competition-card" key={`tatami-${index + 1}`}>
              <h3>Tatami {index + 1}</h3>
              <p>{tatamiItems.length} passage(s) — zone prête pour le futur glisser-déposer</p>
              {tatamiItems.map((item) => (
                <div className="action-card" key={item.id} draggable>
                  <strong>#{item.passageOrder} · {formatTime(item.start)} → {formatTime(item.end)}</strong>
                  <p>{item.label}</p>
                  <small>{item.epreuveLabel} · {item.competitorCount} compétiteur(s) · {item.duration} min</small>
                </div>
              ))}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export { schedulePools, buildStats, formatTime, parseTime };
export default PlanningManager;
