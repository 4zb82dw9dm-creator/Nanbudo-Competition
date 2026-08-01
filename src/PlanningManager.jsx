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

function normalizeEvent(value) {
  const event = String(value || "").toLowerCase();

  if (event.includes("ju") && event.includes("randori")) return "juRandori";
  if (event.includes("randori")) return "randori";
  return "kata";
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

function schedulePools(pools, categories, settings) {
  const startMinutes = parseTime(settings.startTime);
  const tatamis = Array.from({ length: settings.tatamiCount }, (_, index) => ({
    index: index + 1,
    availableAt: startMinutes,
  }));

  const scheduled = [...pools]
    .map((pool, order) => ({ pool, order, duration: getPoolDuration(pool, settings.durations) }))
    .sort((a, b) => b.duration - a.duration || a.order - b.order)
    .map(({ pool, duration }) => {
      tatamis.sort((a, b) => a.availableAt - b.availableAt || a.index - b.index);
      const tatami = tatamis[0];
      let start = tatami.availableAt;

      if (start >= LUNCH_START && start < LUNCH_END) {
        start = LUNCH_END;
      }

      const end = start + duration;
      tatami.availableAt = end > LUNCH_START && start < LUNCH_START ? Math.max(end, LUNCH_END) : end;

      return {
        id: pool.id,
        pool,
        label: getPoolLabel(pool, categories),
        epreuveLabel: pool.epreuveLabel || pool.epreuve || "Épreuve",
        tatami: tatami.index,
        start,
        end,
        duration,
        competitorCount: getCompetitorCount(pool, categories),
      };
    })
    .sort((a, b) => a.start - b.start || a.tatami - b.tatami || a.label.localeCompare(b.label));

  return scheduled;
}

function buildStats(scheduled, categories) {
  const categoryIds = new Set(categories.map((category) => category.id));
  scheduled.forEach((item) => {
    if (item.pool.categoryId) categoryIds.add(item.pool.categoryId);
  });

  const competitorIds = new Set();
  scheduled.forEach((item) => {
    (item.pool.competitorIds || []).forEach((id) => competitorIds.add(id));
  });

  const totalDuration = scheduled.reduce((total, item) => total + item.duration, 0);
  const beforeLunch = scheduled
    .filter((item) => item.start < LUNCH_START)
    .reduce((total, item) => total + item.duration, 0);
  const afterLunch = totalDuration - beforeLunch;
  const endTime = scheduled.reduce((latest, item) => Math.max(latest, item.end), parseTime(DEFAULT_START_TIME));

  return {
    categoryCount: categoryIds.size,
    poolCount: scheduled.length,
    competitorCount: competitorIds.size,
    totalDuration,
    beforeLunch,
    afterLunch,
    endTime,
  };
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
  const stats = useMemo(() => buildStats(scheduled, categories), [categories, scheduled]);

  function updateDuration(key, value) {
    setDurations((current) => ({ ...current, [key]: value }));
  }

  function exportPdf() {
    const rows = scheduled
      .map(
        (item) => `<tr><td>${formatTime(item.start)}</td><td>${formatTime(item.end)}</td><td>Tatami ${item.tatami}</td><td>${item.label}</td><td>${item.epreuveLabel}</td><td>${item.competitorCount}</td></tr>`
      )
      .join("");
    const popup = window.open("", "_blank");
    if (!popup) return;

    popup.document.write(`<!doctype html><html><head><title>Planning compétition</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#172033}header{display:flex;gap:16px;align-items:center;border-bottom:2px solid #d71920;padding-bottom:16px}img{width:90px;object-fit:contain}.meta{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px;margin:24px 0}.card{border:1px solid #ddd;border-radius:10px;padding:10px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f5f7}.pause{background:#fff3cd;border:1px solid #f3d27a;border-radius:10px;padding:12px;margin:16px 0}@media print{button{display:none}}</style></head><body><header><img src="${logoAfdp}" alt="Logo AFDP"><div><h1>${competition.nom || "Planning compétition"}</h1><p>${competition.lieu || "Lieu à définir"} · ${competition.date || "Date à définir"}</p></div></header><section class="meta"><div class="card"><strong>Heure de début</strong><br>${formatTime(parseTime(settings.startTime))}</div><div class="card"><strong>Heure de fin estimée</strong><br>${formatTime(stats.endTime)}</div><div class="card"><strong>Nombre de tatamis</strong><br>${settings.tatamiCount}</div><div class="card"><strong>Pause déjeuner</strong><br>12h00 à 14h00</div></section><div class="pause">Aucune nouvelle poule ne démarre pendant la pause méridienne. Une poule commencée avant 12h00 se termine avant la reprise à 14h00.</div><table><thead><tr><th>Début</th><th>Fin</th><th>Tatami</th><th>Poule</th><th>Épreuve</th><th>Compétiteurs</th></tr></thead><tbody>${rows}</tbody></table><script>window.print();</script></body></html>`);
    popup.document.close();
  }

  return (
    <section className="planning-manager">
      <div className="section-title">
        <p className="surtitle">Planning</p>
        <h2>Assistant d'organisation</h2>
        <p>Génère automatiquement les horaires en respectant la pause méridienne obligatoire de 12h00 à 14h00.</p>
      </div>

      <div className="action-grid">
        <label className="action-card">Heure de début<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
        <label className="action-card">Nombre de tatamis<input type="number" min="1" max="8" value={tatamiCount} onChange={(event) => setTatamiCount(event.target.value)} /></label>
        <label className="action-card">Durée Kata (min)<input type="number" min="1" value={durations.kata} onChange={(event) => updateDuration("kata", event.target.value)} /></label>
        <label className="action-card">Durée Randori (min)<input type="number" min="1" value={durations.randori} onChange={(event) => updateDuration("randori", event.target.value)} /></label>
        <label className="action-card">Durée Ju Randori (min)<input type="number" min="1" value={durations.juRandori} onChange={(event) => updateDuration("juRandori", event.target.value)} /></label>
        <button className="action-card" type="button" onClick={exportPdf}>Exporter PDF</button>
      </div>

      <div className="dashboard">
        <div className="card"><span className="number">{formatTime(stats.endTime)}</span><h3>Fin estimée</h3><p>Compétition</p></div>
        <div className="card"><span className="number">{stats.categoryCount}</span><h3>Catégories</h3><p>Total</p></div>
        <div className="card"><span className="number">{stats.poolCount}</span><h3>Poules</h3><p>Planifiées</p></div>
        <div className="card"><span className="number">{stats.competitorCount}</span><h3>Compétiteurs</h3><p>Concernés</p></div>
        <div className="card"><span className="number">{formatDuration(stats.totalDuration)}</span><h3>Durée totale</h3><p>Temps de passage</p></div>
        <div className="card"><span className="number">{formatDuration(stats.beforeLunch)}</span><h3>Avant pause</h3><p>Avant 12h00</p></div>
        <div className="card"><span className="number">{formatDuration(stats.afterLunch)}</span><h3>Après pause</h3><p>Après 14h00</p></div>
      </div>

      <div className="competition-list">
        {scheduled.map((item) => (
          <article className="competition-card" key={item.id}>
            <h3>{formatTime(item.start)} → {formatTime(item.end)} · Tatami {item.tatami}</h3>
            <p>{item.label}</p>
            <small>{item.epreuveLabel} · {item.competitorCount} compétiteur(s) · {item.duration} min</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export { schedulePools, buildStats, formatTime, parseTime };
export default PlanningManager;
