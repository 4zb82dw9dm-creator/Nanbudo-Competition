import { useState } from "react";

function MatchManager({
  match,
  competitor,
  passage,
  initialResult,
  onSave,
  mode,
  type,
  eventType,
  kataStage = "",
  category,
  pool,
}) {
  /*
   * =========================================================
   * MODE
   * =========================================================
   */

  const kataMode =
    mode === "kata" || type === "kata";

  /*
   * =========================================================
   * KATA — TYPE DE PASSAGE
   * =========================================================
   */

  const kataTieBreakMode =
    kataStage === "tie-break" ||
    passage === "Kata imposé";

  const kataFinalMode =
    kataStage === "final" ||
    kataStage === "finale" ||
    kataStage === "petite-finale";

  function getKataTitle() {
    if (kataTieBreakMode) {
      return "Kata imposé de départage";
    }

    if (kataFinalMode) {
      return "Notation de la phase finale";
    }

    return "Feuille de notation";
  }

  function getKataPassageLabel() {
    if (kataTieBreakMode) {
      return "Kata imposé par l'équipe d'arbitrage";
    }

    if (kataStage === "finale") {
      return "Finale";
    }

    if (kataStage === "petite-finale") {
      return "Petite finale";
    }

    if (passage) {
      return `Passage ${passage}`;
    }

    return "";
  }

  /*
   * =========================================================
   * KATA — NOTES
   * =========================================================
   */

  const [notesKata, setNotesKata] = useState(() => {
    if (
      initialResult?.notes &&
      initialResult.notes.length === 5
    ) {
      return initialResult.notes.map(Number);
    }

    return [4.5, 4.5, 4.5, 4.5, 4.5];
  });

  function modifierNoteKata(index, valeur) {
    const nombre = Number(valeur);

    setNotesKata((actuelles) =>
      actuelles.map((note, i) =>
        i === index ? nombre : note
      )
    );
  }

  function calculerKata() {
    const notes = notesKata.map(Number);

    const noteMax = Math.max(...notes);
    const noteMin = Math.min(...notes);

    const indexMax = notes.indexOf(noteMax);
    let indexMin = notes.indexOf(noteMin);

    if (indexMin === indexMax) {
      indexMin = notes.findIndex(
        (_, index) => index !== indexMax
      );
    }

    const notesRetenues = notes.filter(
      (_, index) =>
        index !== indexMax &&
        index !== indexMin
    );

    const total = notesRetenues.reduce(
      (somme, note) => somme + note,
      0
    );

    return {
      notes,
      indexMax,
      indexMin,
      noteMax,
      noteMin,
      notesRetenues,
      total: Number(total.toFixed(1)),
    };
  }

  const resultatKata = calculerKata();

  const kataJudgesCompleted = notesKata.filter((note) =>
    Number.isFinite(Number(note))
  ).length;

  const kataJudgesTotal = notesKata.length;

  const kataProgressPercent = kataJudgesTotal
    ? (kataJudgesCompleted / kataJudgesTotal) * 100
    : 0;

  const moyenneKata = notesKata.length
    ? notesKata.reduce(
        (somme, note) => somme + Number(note),
        0
      ) / notesKata.length
    : 0;

  const kataCategoryLabel =
    category?.nom || category?.name || pool?.nom || "—";

  const kataTatamiLabel =
    pool?.tatami ||
    pool?.tatamiNumber ||
    pool?.tatamiId ||
    category?.tatami ||
    "—";

  const kataPassageNumber =
    typeof passage === "number" ||
    typeof passage === "string"
      ? passage
      : "—";

  /*
   * =========================================================
   * JU RANDORI — 7 ASSAUTS
   * =========================================================
   */

  const [assauts, setAssauts] = useState(() => {
    if (
      match?.assauts &&
      match.assauts.length === 7
    ) {
      return match.assauts;
    }

    return Array.from(
      { length: 7 },
      () => ({
        juge1: "",
        juge2: "",
        juge3: "",
      })
    );
  });

  /*
   * =========================================================
   * JU RANDORI — PÉNALITÉS
   * =========================================================
   */

  const [penalitesAka, setPenalitesAka] =
    useState(() => {
      return (
        match?.penalitesAka || {
          keikoku: 0,
          fujubun: 0,
          chui: 0,
          hansokuChui: 0,
          shikaku: false,
        }
      );
    });

  const [penalitesShiro, setPenalitesShiro] =
    useState(() => {
      return (
        match?.penalitesShiro || {
          keikoku: 0,
          fujubun: 0,
          chui: 0,
          hansokuChui: 0,
          shikaku: false,
        }
      );
    });

  /*
   * =========================================================
   * JU RANDORI — DÉPARTAGE
   * =========================================================
   */

  const techniquesDepartage = [
    "Tsuki",
    "Mae Geri",
    "Mawashi Geri",
  ];

  const [
    assautsDepartage,
    setAssautsDepartage,
  ] = useState(() => {
    if (
      match?.assautsDepartage &&
      match.assautsDepartage.length === 3
    ) {
      return match.assautsDepartage;
    }

    return techniquesDepartage.map(
      (technique) => ({
        technique,
        juge1: "",
        juge2: "",
        juge3: "",
      })
    );
  });

  /*
   * =========================================================
   * JU RANDORI — DRAPEAUX
   * =========================================================
   */

  const [
    decisionDrapeaux,
    setDecisionDrapeaux,
  ] = useState(() => {
    if (
      match?.decisionDrapeaux === "aka" ||
      match?.decisionDrapeaux === "shiro"
    ) {
      return match.decisionDrapeaux;
    }

    return "";
  });

  /*
   * =========================================================
   * MODIFICATION DES VOTES
   * =========================================================
   */

  function modifierVote(
    numeroAssaut,
    juge,
    valeur
  ) {
    setAssauts((actuels) =>
      actuels.map((assaut, index) =>
        index === numeroAssaut
          ? {
              ...assaut,
              [juge]: valeur,
            }
          : assaut
      )
    );

    setDecisionDrapeaux("");
  }

  function modifierVoteDepartage(
    numeroAssaut,
    juge,
    valeur
  ) {
    setAssautsDepartage((actuels) =>
      actuels.map((assaut, index) =>
        index === numeroAssaut
          ? {
              ...assaut,
              [juge]: valeur,
            }
          : assaut
      )
    );

    setDecisionDrapeaux("");
  }

  /*
   * =========================================================
   * VÉRIFICATION DES 7 ASSAUTS
   * =========================================================
   */

  const assautsComplets = assauts.every(
    (assaut) =>
      assaut.juge1 &&
      assaut.juge2 &&
      assaut.juge3
  );

  const nombreVotesRenseignes = assauts.reduce(
    (total, assaut) =>
      total +
      ["juge1", "juge2", "juge3"].filter(
        (juge) => Boolean(assaut[juge])
      ).length,
    0
  );

  /*
   * =========================================================
   * CALCUL DES 7 ASSAUTS
   * =========================================================
   */

  function calculerScore() {
    let aka = 0;
    let shiro = 0;

    assauts.forEach((assaut) => {
      ["juge1", "juge2", "juge3"].forEach(
        (juge) => {
          const vote = assaut[juge];

          if (vote === "aka") {
            aka += 1;
          }

          if (vote === "shiro") {
            shiro += 1;
          }

          if (vote === "hikiwake") {
            aka += 1;
            shiro += 1;
          }
        }
      );
    });

    return {
      aka,
      shiro,
    };
  }

  const score = calculerScore();

  /*
   * =========================================================
   * CALCUL DU DÉPARTAGE
   * =========================================================
   */

  function calculerScoreDepartage() {
    let aka = 0;
    let shiro = 0;

    assautsDepartage.forEach((assaut) => {
      ["juge1", "juge2", "juge3"].forEach(
        (juge) => {
          const vote = assaut[juge];

          if (vote === "aka") {
            aka += 1;
          }

          if (vote === "shiro") {
            shiro += 1;
          }

          if (vote === "hikiwake") {
            aka += 1;
            shiro += 1;
          }
        }
      );
    });

    return {
      aka,
      shiro,
    };
  }

  const scoreDepartage =
    calculerScoreDepartage();

  const departageComplet =
    assautsDepartage.every(
      (assaut) =>
        assaut.juge1 &&
        assaut.juge2 &&
        assaut.juge3
    );

  /*
   * =========================================================
   * PÉNALITÉS
   * =========================================================
   */

  function ajouterPenalite(
    couleur,
    typePenalite
  ) {
    const setter =
      couleur === "aka"
        ? setPenalitesAka
        : setPenalitesShiro;

    setter((actuelles) => {
      const nouvelles = {
        ...actuelles,
      };

      if (typePenalite === "shikaku") {
        nouvelles.shikaku = true;
        return nouvelles;
      }

      if (typePenalite === "keikoku") {
        nouvelles.keikoku += 1;

        if (nouvelles.keikoku >= 3) {
          nouvelles.keikoku = 0;
          nouvelles.fujubun += 1;
        }
      }

      if (typePenalite === "fujubun") {
        nouvelles.fujubun += 1;
      }

      if (typePenalite === "chui") {
        nouvelles.chui += 1;
      }

      if (typePenalite === "hansokuChui") {
        nouvelles.hansokuChui += 1;
      }

      if (nouvelles.fujubun >= 3) {
        nouvelles.fujubun = 0;
        nouvelles.hansokuChui += 1;
      }

      return nouvelles;
    });

    setDecisionDrapeaux("");
  }

  function calculerPointsNegatifs(penalites) {
    return (
      penalites.fujubun +
      penalites.chui * 2 +
      penalites.hansokuChui * 3
    );
  }

  const pointsNegatifsAka =
    calculerPointsNegatifs(penalitesAka);

  const pointsNegatifsShiro =
    calculerPointsNegatifs(penalitesShiro);

  const scoreFinalAka =
    score.aka - pointsNegatifsAka;

  const scoreFinalShiro =
    score.shiro - pointsNegatifsShiro;

  /*
   * =========================================================
   * DISQUALIFICATION
   * =========================================================
   */

  const akaDisqualifie =
    penalitesAka.hansokuChui > 0 ||
    penalitesAka.shikaku;

  const shiroDisqualifie =
    penalitesShiro.hansokuChui > 0 ||
    penalitesShiro.shikaku;

  /*
   * =========================================================
   * VAINQUEUR NORMAL
   * =========================================================
   */

  function determinerVainqueurNormal() {
    /*
     * Une disqualification peut terminer le
     * combat immédiatement.
     */

    if (
      akaDisqualifie &&
      !shiroDisqualifie
    ) {
      return "shiro";
    }

    if (
      shiroDisqualifie &&
      !akaDisqualifie
    ) {
      return "aka";
    }

    if (
      akaDisqualifie &&
      shiroDisqualifie
    ) {
      return null;
    }

    /*
     * Sans disqualification, les 7 assauts
     * doivent être entièrement arbitrés.
     */

    if (!assautsComplets) {
      return null;
    }

    if (
      scoreFinalAka >
      scoreFinalShiro
    ) {
      return "aka";
    }

    if (
      scoreFinalShiro >
      scoreFinalAka
    ) {
      return "shiro";
    }

    return null;
  }

  const vainqueurNormal =
    determinerVainqueurNormal();

  /*
   * =========================================================
   * DÉPARTAGE
   * =========================================================
   */

  const departageActif =
    assautsComplets &&
    !akaDisqualifie &&
    !shiroDisqualifie &&
    scoreFinalAka === scoreFinalShiro;

  function determinerVainqueurDepartage() {
    if (!departageActif) {
      return null;
    }

    if (!departageComplet) {
      return null;
    }

    if (
      scoreDepartage.aka >
      scoreDepartage.shiro
    ) {
      return "aka";
    }

    if (
      scoreDepartage.shiro >
      scoreDepartage.aka
    ) {
      return "shiro";
    }

    return null;
  }

  const vainqueurDepartage =
    determinerVainqueurDepartage();

  const egaliteApresDepartage =
    departageActif &&
    departageComplet &&
    scoreDepartage.aka ===
      scoreDepartage.shiro;

  /*
   * =========================================================
   * VAINQUEUR OFFICIEL
   * =========================================================
   */

  let vainqueurOfficiel = null;
  let decisionType = null;

  if (
    akaDisqualifie &&
    !shiroDisqualifie
  ) {
    vainqueurOfficiel = "shiro";
    decisionType = "disqualification";
  } else if (
    shiroDisqualifie &&
    !akaDisqualifie
  ) {
    vainqueurOfficiel = "aka";
    decisionType = "disqualification";
  } else if (
    !akaDisqualifie &&
    !shiroDisqualifie &&
    vainqueurNormal
  ) {
    vainqueurOfficiel =
      vainqueurNormal;

    decisionType = "score";
  } else if (
    departageActif &&
    vainqueurDepartage
  ) {
    vainqueurOfficiel =
      vainqueurDepartage;

    decisionType = "departage";
  } else if (
    egaliteApresDepartage &&
    decisionDrapeaux
  ) {
    vainqueurOfficiel =
      decisionDrapeaux;

    decisionType = "drapeaux";
  }

  /*
   * =========================================================
   * AFFICHAGE KATA
   * =========================================================
   */

  if (kataMode) {
    const competiteur =
      competitor ||
      match?.competiteur ||
      match?.aka ||
      null;

    const passageLabel =
      getKataPassageLabel();

    return (
      <section className="match-manager">
        <div className="manager-header">
          <div>
            <p className="surtitle">
              {kataTieBreakMode
                ? "DÉPARTAGE KATA"
                : kataFinalMode
                ? "PHASE FINALE KATA"
                : "KATA"}
            </p>

            <h2>{getKataTitle()}</h2>

            <p>
              {competiteur
                ? `${competiteur.nom || ""} ${
                    competiteur.prenom || ""
                  }`
                : "Compétiteur"}
            </p>

            {passageLabel && (
              <p>{passageLabel}</p>
            )}
          </div>
        </div>

        {kataTieBreakMode && (
          <div className="beta-note">
            <strong>
              ⚖️ Kata de départage
            </strong>

            <p>
              Ce passage est utilisé pour
              départager les compétiteurs après
              une égalité en finale ou en petite
              finale.
            </p>

            <p>
              Le Kata est imposé par l'équipe
              d'arbitrage.
            </p>
          </div>
        )}

        <div className="kata-sticky-header">
          <div className="kata-live-main">
            <div>
              <p className="surtitle">
                Score live
              </p>

              <h2>
                {resultatKata.total.toFixed(1)}
              </h2>

              <p>
                Total des 3 notes retenues
              </p>
            </div>

            <div>
              <p className="surtitle">
                Moyenne provisoire
              </p>

              <h2>
                {moyenneKata.toFixed(1)}
              </h2>

              <p>
                Moyenne des notes saisies
              </p>
            </div>
          </div>

          <div className="kata-live-details">
            <span>
              <strong>Nom</strong>
              {competitor?.nom || "—"}
            </span>

            <span>
              <strong>Prénom</strong>
              {competitor?.prenom || "—"}
            </span>

            <span>
              <strong>Club</strong>
              {competitor?.club || "—"}
            </span>

            <span>
              <strong>Catégorie</strong>
              {kataCategoryLabel}
            </span>

            <span>
              <strong>Épreuve</strong>
              {eventType || "—"}
            </span>

            <span>
              <strong>Tatami</strong>
              {kataTatamiLabel}
            </span>

            <span>
              <strong>Passage</strong>
              {kataPassageNumber}
            </span>
          </div>

          <div className="kata-progress"
            aria-label={`Arbitres : ${kataJudgesCompleted} / ${kataJudgesTotal}`}
          >
            <div className="kata-progress-label">
              <strong>Arbitres</strong>
              <span>
                {kataJudgesCompleted} / {kataJudgesTotal}
              </span>
            </div>

            <div className="kata-progress-track">
              <div
                className="kata-progress-bar"
                style={{
                  width: `${kataProgressPercent}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="penalties">
          <h3>Notes des arbitres</h3>

          <p>
            Notes autorisées : 3,9 à 4,9.
          </p>

          <div className="penalties-grid">
            {notesKata.map(
              (note, index) => {
                const eliminee =
                  index ===
                    resultatKata.indexMax ||
                  index ===
                    resultatKata.indexMin;

                return (
                  <div
                    className="penalty-card"
                    key={index}
                  >
                    <h3>
                      Juge {index + 1}
                    </h3>

                    <h2>
                      {Number(note).toFixed(1)}
                    </h2>

                    <input
                      type="range"
                      min="3.9"
                      max="4.9"
                      step="0.1"
                      value={note}
                      onChange={(event) =>
                        modifierNoteKata(
                          index,
                          event.target.value
                        )
                      }
                    />

                    <select
                      value={note}
                      onChange={(event) =>
                        modifierNoteKata(
                          index,
                          event.target.value
                        )
                      }
                    >
                      {[
                        3.9,
                        4.0,
                        4.1,
                        4.2,
                        4.3,
                        4.4,
                        4.5,
                        4.6,
                        4.7,
                        4.8,
                        4.9,
                      ].map((valeur) => (
                        <option
                          key={valeur}
                          value={valeur}
                        >
                          {valeur.toFixed(1)}
                        </option>
                      ))}
                    </select>

                    {index ===
                      resultatKata.indexMax && (
                      <p>
                        ⬆️ Note la plus haute —
                        retirée
                      </p>
                    )}

                    {index ===
                      resultatKata.indexMin && (
                      <p>
                        ⬇️ Note la plus basse —
                        retirée
                      </p>
                    )}

                    {!eliminee && (
                      <p>✅ Note retenue</p>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        <div className="match-result">
          <h3>
            {kataTieBreakMode
              ? "Résultat du Kata imposé"
              : "Résultat"}
          </h3>

          <p>
            Notes :{" "}
            {resultatKata.notes
              .map((note) =>
                note.toFixed(1)
              )
              .join(" · ")}
          </p>

          <p>
            Note la plus basse retirée :{" "}
            <strong>
              {resultatKata.noteMin.toFixed(1)}
            </strong>
          </p>

          <p>
            Note la plus haute retirée :{" "}
            <strong>
              {resultatKata.noteMax.toFixed(1)}
            </strong>
          </p>

          <p>
            Notes retenues :{" "}
            <strong>
              {resultatKata.notesRetenues
                .map((note) =>
                  note.toFixed(1)
                )
                .join(" + ")}
            </strong>
          </p>

          <p>
            Total :{" "}
            <strong>
              {resultatKata.total.toFixed(1)}
            </strong>
          </p>

          {onSave && (
            <button
              type="button"
              className="primary"
              onClick={() =>
                onSave({
                  type: "kata",

                  kataStage:
                    kataStage ||
                    (kataTieBreakMode
                      ? "tie-break"
                      : ""),

                  notes:
                    resultatKata.notes,

                  notesRetenues:
                    resultatKata.notesRetenues,

                  noteRetireeBasse:
                    resultatKata.noteMin,

                  noteRetireeHaute:
                    resultatKata.noteMax,

                  noteMin:
                    resultatKata.noteMin,

                  noteMax:
                    resultatKata.noteMax,

                  total:
                    resultatKata.total,

                  score:
                    resultatKata.total,
                })
              }
            >
              {kataTieBreakMode
                ? initialResult
                  ? "Enregistrer les modifications du Kata imposé"
                  : "Enregistrer le Kata imposé"
                : initialResult
                ? passage
                  ? `Enregistrer les modifications du passage ${passage}`
                  : "Enregistrer les modifications"
                : passage
                ? `Enregistrer le passage ${passage}`
                : "Enregistrer la note"}
            </button>
          )}
        </div>
      </section>
    );
  }

  const combatCategoryLabel =
    category?.nom || category?.name || pool?.nom || "—";

  const combatTatamiLabel =
    pool?.tatami ||
    pool?.tatamiNumber ||
    pool?.tatamiId ||
    category?.tatami ||
    "—";

  const combatEventLabel =
    eventType || type || mode || "Randori";

  const akaDisplayName = `${match?.aka?.nom || "Compétiteur"} ${
    match?.aka?.prenom || ""
  }`.trim();

  const shiroDisplayName = `${match?.shiro?.nom || "Compétiteur"} ${
    match?.shiro?.prenom || ""
  }`.trim();

  const combatProgressPercent =
    (nombreVotesRenseignes / 21) * 100;

  let decisionProvisoire = "Égalité";

  if (akaDisqualifie && !shiroDisqualifie) {
    decisionProvisoire = "Blanc";
  } else if (shiroDisqualifie && !akaDisqualifie) {
    decisionProvisoire = "Rouge";
  } else if (scoreFinalAka > scoreFinalShiro) {
    decisionProvisoire = "Rouge";
  } else if (scoreFinalShiro > scoreFinalAka) {
    decisionProvisoire = "Blanc";
  }

  /*
   * =========================================================
   * AFFICHAGE JU RANDORI
   * =========================================================
   */

  return (
    <section className="match-manager randori-manager">
      {/* =====================================
          EN-TÊTE
      ===================================== */}

      <div className="manager-header randori-header">
        <div>
          <p className="surtitle">
            {combatEventLabel}
          </p>

          <h2>Feuille de combat</h2>

          {eventType && (
            <p>{eventType}</p>
          )}
        </div>

        <div className="randori-progress">
          <strong>
            {nombreVotesRenseignes}/21
          </strong>

          <span>
            votes renseignés
          </span>
        </div>
      </div>

      <div className="kata-sticky-header randori-sticky-header">
        <div className="kata-live-main randori-live-main">
          <div>
            <p className="surtitle">
              Score live
            </p>

            <h2>
              {scoreFinalAka} — {scoreFinalShiro}
            </h2>

            <p>
              Rouge / Blanc
            </p>
          </div>

          <div>
            <p className="surtitle">
              Décision provisoire
            </p>

            <h2>{decisionProvisoire}</h2>

            <p>
              Mise à jour à chaque saisie
            </p>
          </div>
        </div>

        <div className="kata-live-details randori-live-details">
          <span>
            <strong>Tatami</strong>
            {combatTatamiLabel}
          </span>

          <span>
            <strong>Épreuve</strong>
            {combatEventLabel}
          </span>

          <span>
            <strong>Catégorie</strong>
            {combatCategoryLabel}
          </span>

          <span>
            <strong>Rouge</strong>
            {akaDisplayName}
          </span>

          <span>
            <strong>Club rouge</strong>
            {match?.aka?.club || "—"}
          </span>

          <span>
            <strong>Blanc</strong>
            {shiroDisplayName}
          </span>

          <span>
            <strong>Club blanc</strong>
            {match?.shiro?.club || "—"}
          </span>
        </div>

        <div
          className="kata-progress"
          aria-label={`Arbitres : ${nombreVotesRenseignes} / 21`}
        >
          <div className="kata-progress-label">
            <strong>Arbitres</strong>
            <span>
              {nombreVotesRenseignes} / 21 votes
            </span>
          </div>

          <div className="kata-progress-track">
            <div
              className="kata-progress-bar"
              style={{
                width: `${combatProgressPercent}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* =====================================
          TABLEAU PRINCIPAL
          AKA / CENTRE / SHIRO
      ===================================== */}

      <div className="randori-scoreboard">
        {/* AKA */}

        <div className="fighter-panel fighter-aka">
          <p className="fighter-label">
            🔴 AKA
          </p>

          <h2 className="fighter-name">
            {match?.aka?.nom ||
              "Compétiteur"}{" "}
            {match?.aka?.prenom || ""}
          </h2>

          <div className="fighter-score">
            {scoreFinalAka}
          </div>

          <p>
            Score brut :{" "}
            <strong>{score.aka}</strong>
          </p>

          <p>
            Points négatifs :{" "}
            <strong>
              {pointsNegatifsAka}
            </strong>
          </p>

          {akaDisqualifie && (
            <div className="fighter-disqualified">
              ⛔ DISQUALIFIÉ
            </div>
          )}
        </div>

        {/* CENTRE */}

        <div className="fight-center-panel">
          <p className="surtitle">
            SCORE OFFICIEL
          </p>

          <div className="fight-main-score">
            <strong>{scoreFinalAka}</strong>

            <span>—</span>

            <strong>{scoreFinalShiro}</strong>
          </div>

          {!assautsComplets &&
            !akaDisqualifie &&
            !shiroDisqualifie && (
              <div className="fight-status">
                Combat en cours
              </div>
            )}

          {assautsComplets &&
            !departageActif &&
            vainqueurNormal && (
              <div className="fight-status finished">
                7 assauts terminés
              </div>
            )}

          {departageActif && (
            <div className="fight-status tie">
              ⚖️ ÉGALITÉ
            </div>
          )}

          {decisionType ===
            "disqualification" && (
            <div className="fight-status finished">
              Combat terminé
            </div>
          )}

          <p className="fight-progress-text">
            {nombreVotesRenseignes} vote
            {nombreVotesRenseignes > 1
              ? "s"
              : ""}{" "}
            sur 21
          </p>
        </div>

        {/* SHIRO */}

        <div className="fighter-panel fighter-shiro">
          <p className="fighter-label">
            SHIRO ⚪
          </p>

          <h2 className="fighter-name">
            {match?.shiro?.nom ||
              "Compétiteur"}{" "}
            {match?.shiro?.prenom || ""}
          </h2>

          <div className="fighter-score">
            {scoreFinalShiro}
          </div>

          <p>
            Score brut :{" "}
            <strong>{score.shiro}</strong>
          </p>

          <p>
            Points négatifs :{" "}
            <strong>
              {pointsNegatifsShiro}
            </strong>
          </p>

          {shiroDisqualifie && (
            <div className="fighter-disqualified">
              ⛔ DISQUALIFIÉ
            </div>
          )}
        </div>
      </div>

      {/* =====================================
          PÉNALITÉS
      ===================================== */}

      <div className="penalties randori-penalties">
        <div className="randori-section-title">
          <p className="surtitle">
            SANCTIONS
          </p>

          <h3>Pénalités</h3>
        </div>

        <div className="penalties-grid randori-penalties-grid">
          {/* AKA */}

          <div className="penalty-card penalty-card-aka">
            <div className="penalty-card-header">
              <div>
                <p className="surtitle">
                  AKA
                </p>

                <h3>
                  🔴{" "}
                  {match?.aka?.nom ||
                    "Compétiteur"}
                </h3>
              </div>

              <strong className="negative-points">
                -{pointsNegatifsAka} PN
              </strong>
            </div>

            <div className="penalty-summary">
              <span>
                Keikoku{" "}
                <strong>
                  {penalitesAka.keikoku}
                </strong>
              </span>

              <span>
                Fujubun{" "}
                <strong>
                  {penalitesAka.fujubun}
                </strong>
              </span>

              <span>
                Chui{" "}
                <strong>
                  {penalitesAka.chui}
                </strong>
              </span>

              <span>
                Hansoku Chui{" "}
                <strong>
                  {
                    penalitesAka.hansokuChui
                  }
                </strong>
              </span>
            </div>

            <div className="penalty-buttons">
              <button
                type="button"
                onClick={() =>
                  ajouterPenalite(
                    "aka",
                    "keikoku"
                  )
                }
              >
                + Keikoku
              </button>

              <button
                type="button"
                onClick={() =>
                  ajouterPenalite(
                    "aka",
                    "fujubun"
                  )
                }
              >
                + Fujubun
              </button>

              <button
                type="button"
                onClick={() =>
                  ajouterPenalite(
                    "aka",
                    "chui"
                  )
                }
              >
                + Chui
              </button>

              <button
                type="button"
                onClick={() =>
                  ajouterPenalite(
                    "aka",
                    "hansokuChui"
                  )
                }
              >
                + Hansoku Chui
              </button>

              <button
                type="button"
                className="danger-penalty"
                onClick={() =>
                  ajouterPenalite(
                    "aka",
                    "shikaku"
                  )
                }
              >
                Shikaku
              </button>
            </div>

            {penalitesAka.shikaku && (
              <div className="fighter-disqualified">
                ⛔ SHIKAKU
              </div>
            )}
          </div>

          {/* SHIRO */}

          <div className="penalty-card penalty-card-shiro">
            <div className="penalty-card-header">
              <div>
                <p className="surtitle">
                  SHIRO
                </p>

                <h3>
                  ⚪{" "}
                  {match?.shiro?.nom ||
                    "Compétiteur"}
                </h3>
              </div>

              <strong className="negative-points">
                -{pointsNegatifsShiro} PN
              </strong>
            </div>

            <div className="penalty-summary">
              <span>
                Keikoku{" "}
                <strong>
                  {penalitesShiro.keikoku}
                </strong>
              </span>

              <span>
                Fujubun{" "}
                <strong>
                  {penalitesShiro.fujubun}
                </strong>
              </span>

              <span>
                Chui{" "}
                <strong>
                  {penalitesShiro.chui}
                </strong>
              </span>

              <span>
                Hansoku Chui{" "}
                <strong>
                  {
                    penalitesShiro.hansokuChui
                  }
                </strong>
              </span>
            </div>

            <div className="penalty-buttons">
              <button
                type="button"
                onClick={() =>
                  ajouterPenalite(
                    "shiro",
                    "keikoku"
                  )
                }
              >
                + Keikoku
              </button>

              <button
                type="button"
                onClick={() =>
                  ajouterPenalite(
                    "shiro",
                    "fujubun"
                  )
                }
              >
                + Fujubun
              </button>

              <button
                type="button"
                onClick={() =>
                  ajouterPenalite(
                    "shiro",
                    "chui"
                  )
                }
              >
                + Chui
              </button>

              <button
                type="button"
                onClick={() =>
                  ajouterPenalite(
                    "shiro",
                    "hansokuChui"
                  )
                }
              >
                + Hansoku Chui
              </button>

              <button
                type="button"
                className="danger-penalty"
                onClick={() =>
                  ajouterPenalite(
                    "shiro",
                    "shikaku"
                  )
                }
              >
                Shikaku
              </button>
            </div>

            {penalitesShiro.shikaku && (
              <div className="fighter-disqualified">
                ⛔ SHIKAKU
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================
          7 ASSAUTS
      ===================================== */}

      <div className="assauts randori-assauts">
        <div className="randori-section-title">
          <p className="surtitle">
            ARBITRAGE
          </p>

          <h3>
            7 assauts réglementaires
          </h3>

          <p>
            Chaque Fukushin vote AKA,
            Hikiwake ou SHIRO.
          </p>
        </div>

        <div className="assauts-list">
          {assauts.map(
            (assaut, index) => {
              const assautComplet =
                assaut.juge1 &&
                assaut.juge2 &&
                assaut.juge3;

              return (
                <div
                  className={`assaut-card ${
                    assautComplet
                      ? "assaut-complet"
                      : ""
                  }`}
                  key={index}
                >
                  <div className="assaut-header">
                    <div>
                      <p className="surtitle">
                        ASSAUT
                      </p>

                      <h3>
                        Assaut {index + 1}
                      </h3>
                    </div>

                    <span
                      className={`assaut-status ${
                        assautComplet
                          ? "complete"
                          : ""
                      }`}
                    >
                      {assautComplet
                        ? "✓ Complet"
                        : "À arbitrer"}
                    </span>
                  </div>

                  {[
                    "juge1",
                    "juge2",
                    "juge3",
                  ].map(
                    (
                      juge,
                      jugeIndex
                    ) => (
                      <div
                        className="juge"
                        key={juge}
                      >
                        <strong className="juge-label">
                          Fukushin{" "}
                          {jugeIndex + 1}
                        </strong>

                        <div className="juge-votes">
                          <button
                            type="button"
                            className={
                              assaut[
                                juge
                              ] === "aka"
                                ? "vote-button selected aka"
                                : "vote-button"
                            }
                            onClick={() =>
                              modifierVote(
                                index,
                                juge,
                                "aka"
                              )
                            }
                          >
                            🔴 AKA
                          </button>

                          <button
                            type="button"
                            className={
                              assaut[
                                juge
                              ] ===
                              "hikiwake"
                                ? "vote-button selected hikiwake"
                                : "vote-button"
                            }
                            onClick={() =>
                              modifierVote(
                                index,
                                juge,
                                "hikiwake"
                              )
                            }
                          >
                            Hikiwake
                          </button>

                          <button
                            type="button"
                            className={
                              assaut[
                                juge
                              ] === "shiro"
                                ? "vote-button selected shiro"
                                : "vote-button"
                            }
                            onClick={() =>
                              modifierVote(
                                index,
                                juge,
                                "shiro"
                              )
                            }
                          >
                            SHIRO ⚪
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* =====================================
          INFORMATION COMBAT EN COURS
      ===================================== */}

      {!assautsComplets &&
        !akaDisqualifie &&
        !shiroDisqualifie && (
          <div className="beta-note randori-info">
            <strong>
              Arbitrage en cours
            </strong>

            <p>
              {nombreVotesRenseignes} vote
              {nombreVotesRenseignes > 1
                ? "s"
                : ""}{" "}
              renseigné
              {nombreVotesRenseignes > 1
                ? "s"
                : ""}{" "}
              sur 21.
            </p>

            <p>
              Les 7 assauts doivent être
              entièrement arbitrés avant de
              déterminer le résultat du combat.
            </p>
          </div>
        )}

      {/* =====================================
          DÉPARTAGE
      ===================================== */}

      {departageActif &&
        !akaDisqualifie &&
        !shiroDisqualifie && (
          <div className="assauts randori-tiebreak">
            <div className="tiebreak-heading">
              <p className="surtitle">
                DÉPARTAGE
              </p>

              <h2>
                ⚖️ Égalité après les 7 assauts
              </h2>

              <p>
                Score réglementaire :{" "}
                <strong>
                  {scoreFinalAka} —{" "}
                  {scoreFinalShiro}
                </strong>
              </p>

              <p>
                Procéder aux trois techniques
                supplémentaires.
              </p>
            </div>

            <div className="tiebreak-techniques">
              {assautsDepartage.map(
                (assaut, index) => {
                  const techniqueComplete =
                    assaut.juge1 &&
                    assaut.juge2 &&
                    assaut.juge3;

                  return (
                    <div
                      className={`assaut-card ${
                        techniqueComplete
                          ? "assaut-complet"
                          : ""
                      }`}
                      key={
                        assaut.technique ||
                        index
                      }
                    >
                      <div className="assaut-header">
                        <div>
                          <p className="surtitle">
                            DÉPARTAGE{" "}
                            {index + 1}
                          </p>

                          <h3>
                            {
                              assaut.technique
                            }
                          </h3>
                        </div>

                        <span
                          className={`assaut-status ${
                            techniqueComplete
                              ? "complete"
                              : ""
                          }`}
                        >
                          {techniqueComplete
                            ? "✓ Complet"
                            : "À arbitrer"}
                        </span>
                      </div>

                      {[
                        "juge1",
                        "juge2",
                        "juge3",
                      ].map(
                        (
                          juge,
                          jugeIndex
                        ) => (
                          <div
                            className="juge"
                            key={juge}
                          >
                            <strong className="juge-label">
                              Fukushin{" "}
                              {jugeIndex +
                                1}
                            </strong>

                            <div className="juge-votes">
                              <button
                                type="button"
                                className={
                                  assaut[
                                    juge
                                  ] ===
                                  "aka"
                                    ? "vote-button selected aka"
                                    : "vote-button"
                                }
                                onClick={() =>
                                  modifierVoteDepartage(
                                    index,
                                    juge,
                                    "aka"
                                  )
                                }
                              >
                                🔴 AKA
                              </button>

                              <button
                                type="button"
                                className={
                                  assaut[
                                    juge
                                  ] ===
                                  "hikiwake"
                                    ? "vote-button selected hikiwake"
                                    : "vote-button"
                                }
                                onClick={() =>
                                  modifierVoteDepartage(
                                    index,
                                    juge,
                                    "hikiwake"
                                  )
                                }
                              >
                                Hikiwake
                              </button>

                              <button
                                type="button"
                                className={
                                  assaut[
                                    juge
                                  ] ===
                                  "shiro"
                                    ? "vote-button selected shiro"
                                    : "vote-button"
                                }
                                onClick={() =>
                                  modifierVoteDepartage(
                                    index,
                                    juge,
                                    "shiro"
                                  )
                                }
                              >
                                SHIRO ⚪
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div className="randori-scoreboard tiebreak-scoreboard">
              <div className="fighter-panel fighter-aka">
                <p className="fighter-label">
                  🔴 AKA
                </p>

                <div className="fighter-score">
                  {scoreDepartage.aka}
                </div>

                <p>Score départage</p>
              </div>

              <div className="fight-center-panel">
                <p className="surtitle">
                  DÉPARTAGE
                </p>

                <div className="fight-main-score">
                  <strong>
                    {scoreDepartage.aka}
                  </strong>

                  <span>—</span>

                  <strong>
                    {scoreDepartage.shiro}
                  </strong>
                </div>

                {!departageComplet && (
                  <div className="fight-status">
                    En cours
                  </div>
                )}

                {departageComplet &&
                  vainqueurDepartage && (
                    <div className="fight-status finished">
                      Terminé
                    </div>
                  )}

                {egaliteApresDepartage && (
                  <div className="fight-status tie">
                    Égalité persistante
                  </div>
                )}
              </div>

              <div className="fighter-panel fighter-shiro">
                <p className="fighter-label">
                  SHIRO ⚪
                </p>

                <div className="fighter-score">
                  {scoreDepartage.shiro}
                </div>

                <p>Score départage</p>
              </div>
            </div>

            {!departageComplet && (
              <div className="beta-note">
                <strong>
                  Départage en cours
                </strong>

                <p>
                  Renseigne les votes des trois
                  Fukushin pour Tsuki, Mae Geri
                  et Mawashi Geri.
                </p>
              </div>
            )}

            {departageComplet &&
              vainqueurDepartage && (
                <div className="randori-winner-banner">
                  <p className="surtitle">
                    VAINQUEUR DU DÉPARTAGE
                  </p>

                  <h2>
                    🏆{" "}
                    {vainqueurDepartage ===
                    "aka"
                      ? `AKA — ${
                          match?.aka?.nom ||
                          ""
                        } ${
                          match?.aka?.prenom ||
                          ""
                        }`
                      : `SHIRO — ${
                          match?.shiro?.nom ||
                          ""
                        } ${
                          match?.shiro
                            ?.prenom || ""
                        }`}
                  </h2>
                </div>
              )}

            {/* =================================
                DRAPEAUX
            ================================= */}

            {egaliteApresDepartage && (
              <div className="competition-form flags-decision">
                <p className="surtitle">
                  ÉGALITÉ PERSISTANTE
                </p>

                <h3>
                  🏁 Décision aux drapeaux
                </h3>

                <p>
                  Le score reste à égalité
                  après Tsuki, Mae Geri et
                  Mawashi Geri.
                </p>

                <p>
                  L'équipe d'arbitrage doit
                  désigner le vainqueur.
                </p>

                <div className="flags-grid">
                  <button
                    type="button"
                    className={
                      decisionDrapeaux ===
                      "aka"
                        ? "flag-choice flag-aka selected"
                        : "flag-choice flag-aka"
                    }
                    onClick={() =>
                      setDecisionDrapeaux(
                        "aka"
                      )
                    }
                  >
                    <strong>
                      🔴 AKA
                    </strong>

                    <span>
                      {match?.aka?.nom ||
                        "Compétiteur"}{" "}
                      {match?.aka?.prenom ||
                        ""}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      decisionDrapeaux ===
                      "shiro"
                        ? "flag-choice flag-shiro selected"
                        : "flag-choice flag-shiro"
                    }
                    onClick={() =>
                      setDecisionDrapeaux(
                        "shiro"
                      )
                    }
                  >
                    <strong>
                      SHIRO ⚪
                    </strong>

                    <span>
                      {match?.shiro?.nom ||
                        "Compétiteur"}{" "}
                      {match?.shiro?.prenom ||
                        ""}
                    </span>
                  </button>
                </div>

                {decisionDrapeaux && (
                  <div className="randori-winner-banner">
                    <p className="surtitle">
                      DÉCISION AUX DRAPEAUX
                    </p>

                    <h2>
                      🏆{" "}
                      {decisionDrapeaux ===
                      "aka"
                        ? `AKA — ${
                            match?.aka
                              ?.nom || ""
                          } ${
                            match?.aka
                              ?.prenom || ""
                          }`
                        : `SHIRO — ${
                            match?.shiro
                              ?.nom || ""
                          } ${
                            match?.shiro
                              ?.prenom || ""
                          }`}
                    </h2>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* =====================================
          RÉSULTAT FINAL
      ===================================== */}

      <div className="match-result randori-result">
        <div className="randori-section-title">
          <p className="surtitle">
            RÉSULTAT OFFICIEL
          </p>

          <h2>Résultat du combat</h2>
        </div>

        <div className="final-score-line">
          <div>
            <span>🔴 AKA</span>

            <strong>
              {scoreFinalAka}
            </strong>
          </div>

          <span className="final-score-separator">
            —
          </span>

          <div>
            <strong>
              {scoreFinalShiro}
            </strong>

            <span>SHIRO ⚪</span>
          </div>
        </div>

        {!assautsComplets &&
          !akaDisqualifie &&
          !shiroDisqualifie && (
            <div className="beta-note">
              <strong>
                Combat en cours
              </strong>

              <p>
                Le résultat sera disponible
                lorsque les 7 assauts auront été
                entièrement arbitrés.
              </p>
            </div>
          )}

        {akaDisqualifie &&
          !shiroDisqualifie && (
            <div className="randori-winner-banner">
              <p className="surtitle">
                DISQUALIFICATION
              </p>

              <h2>
                🏆 SHIRO vainqueur
              </h2>

              <p>
                AKA est disqualifié.
              </p>
            </div>
          )}

        {shiroDisqualifie &&
          !akaDisqualifie && (
            <div className="randori-winner-banner">
              <p className="surtitle">
                DISQUALIFICATION
              </p>

              <h2>
                🏆 AKA vainqueur
              </h2>

              <p>
                SHIRO est disqualifié.
              </p>
            </div>
          )}

        {akaDisqualifie &&
          shiroDisqualifie && (
            <div className="beta-note">
              <strong>
                ⛔ Double disqualification
              </strong>

              <p>
                Le combat ne peut pas être
                enregistré avec un vainqueur
                automatique.
              </p>
            </div>
          )}

        {decisionType === "score" &&
          vainqueurOfficiel && (
            <div className="randori-winner-banner">
              <p className="surtitle">
                VICTOIRE AU SCORE
              </p>

              <h2>
                🏆{" "}
                {vainqueurOfficiel === "aka"
                  ? `AKA — ${
                      match?.aka?.nom || ""
                    } ${
                      match?.aka?.prenom || ""
                    }`
                  : `SHIRO — ${
                      match?.shiro?.nom || ""
                    } ${
                      match?.shiro?.prenom ||
                      ""
                    }`}
              </h2>
            </div>
          )}

        {decisionType ===
          "departage" &&
          vainqueurOfficiel && (
            <div className="randori-winner-banner">
              <p className="surtitle">
                VICTOIRE APRÈS DÉPARTAGE
              </p>

              <h2>
                🏆{" "}
                {vainqueurOfficiel === "aka"
                  ? `AKA — ${
                      match?.aka?.nom || ""
                    } ${
                      match?.aka?.prenom || ""
                    }`
                  : `SHIRO — ${
                      match?.shiro?.nom || ""
                    } ${
                      match?.shiro?.prenom ||
                      ""
                    }`}
              </h2>

              <p>
                Tsuki · Mae Geri · Mawashi
                Geri
              </p>
            </div>
          )}

        {decisionType ===
          "drapeaux" &&
          vainqueurOfficiel && (
            <div className="randori-winner-banner">
              <p className="surtitle">
                DÉCISION AUX DRAPEAUX
              </p>

              <h2>
                🏆{" "}
                {vainqueurOfficiel === "aka"
                  ? `AKA — ${
                      match?.aka?.nom || ""
                    } ${
                      match?.aka?.prenom || ""
                    }`
                  : `SHIRO — ${
                      match?.shiro?.nom || ""
                    } ${
                      match?.shiro?.prenom ||
                      ""
                    }`}
              </h2>
            </div>
          )}

        {/* =====================================
            ENREGISTREMENT
        ===================================== */}

        {onSave && (
          <div className="save-match-zone">
            <button
              type="button"
              className="primary save-match-button"
              disabled={
                !vainqueurOfficiel
              }
              onClick={() => {
                if (
                  !vainqueurOfficiel
                ) {
                  return;
                }

                onSave({
                  type: "ju-randori",

                  /*
                   * 7 ASSAUTS
                   */

                  assauts,

                  scoreBrutAka:
                    score.aka,

                  scoreBrutShiro:
                    score.shiro,

                  scoreAka:
                    scoreFinalAka,

                  scoreShiro:
                    scoreFinalShiro,

                  /*
                   * PÉNALITÉS
                   */

                  penalitesAka,

                  penalitesShiro,

                  pointsNegatifsAka,

                  pointsNegatifsShiro,

                  akaDisqualifie,

                  shiroDisqualifie,

                  /*
                   * DÉPARTAGE
                   */

                  departageActif,

                  assautsDepartage:
                    departageActif
                      ? assautsDepartage
                      : [],

                  scoreDepartageAka:
                    departageActif
                      ? scoreDepartage.aka
                      : null,

                  scoreDepartageShiro:
                    departageActif
                      ? scoreDepartage.shiro
                      : null,

                  /*
                   * RÉSULTAT
                   */

                  vainqueur:
                    vainqueurOfficiel,

                  decisionType,

                  decisionDrapeaux:
                    decisionType ===
                    "drapeaux"
                      ? decisionDrapeaux
                      : null,
                });
              }}
            >
              {!vainqueurOfficiel
                ? !assautsComplets &&
                  !akaDisqualifie &&
                  !shiroDisqualifie
                  ? `Arbitrage en cours — ${nombreVotesRenseignes}/21`
                  : departageActif &&
                    !departageComplet
                  ? "Terminer le départage avant d'enregistrer"
                  : egaliteApresDepartage &&
                    !decisionDrapeaux
                  ? "Désigner le vainqueur avant d'enregistrer"
                  : "Combat en cours"
                : match?.statut ===
                  "Terminé"
                ? "Enregistrer les modifications"
                : "Enregistrer le combat"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default MatchManager;
