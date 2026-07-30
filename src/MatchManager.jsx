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

  // Utilisé pour distinguer un passage normal,
  // une finale et un Kata imposé de départage.
  kataStage = "",
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

    /*
     * Si les 5 notes sont identiques,
     * on retire deux juges différents.
     */

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
   *
   * En cas d'égalité après les 7 assauts :
   *
   * 1. Tsuki
   * 2. Mae Geri
   * 3. Mawashi Geri
   *
   * Chaque technique est jugée par les 3 Fukushin.
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
   * MODIFIER UN VOTE NORMAL
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

    /*
     * Si le combat est modifié,
     * une ancienne décision de départage
     * ne doit plus être considérée comme valide.
     */

    setDecisionDrapeaux("");
  }

  /*
   * =========================================================
   * MODIFIER UN VOTE DE DÉPARTAGE
   * =========================================================
   */

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
   * CALCUL DES 7 ASSAUTS
   * =========================================================
   */

  function calculerScore() {
    let aka = 0;
    let shiro = 0;

    assauts.forEach((assaut) => {
      Object.values(assaut).forEach((vote) => {
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
      });
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

  /*
   * =========================================================
   * VÉRIFICATION DES ASSAUTS DE DÉPARTAGE
   * =========================================================
   */

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
   * VAINQUEUR APRÈS LES 7 ASSAUTS
   * =========================================================
   */

  function determinerVainqueurNormal() {
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
   * FAUT-IL UN DÉPARTAGE ?
   * =========================================================
   */

  const departageActif =
    !akaDisqualifie &&
    !shiroDisqualifie &&
    scoreFinalAka === scoreFinalShiro;

  /*
   * =========================================================
   * VAINQUEUR DU DÉPARTAGE
   * =========================================================
   */

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

  /*
   * =========================================================
   * ÉGALITÉ APRÈS DÉPARTAGE
   * =========================================================
   */

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
              départager les compétiteurs
              après une égalité en finale
              ou en petite finale.
            </p>

            <p>
              Le Kata est imposé par
              l'équipe d'arbitrage.
            </p>
          </div>
        )}

        <div className="match-score">
          <div>
            <strong>
              NOTE FINALE
            </strong>

            <h2>
              {resultatKata.total.toFixed(1)}
            </h2>

            <p>
              Total des 3 notes retenues
            </p>
          </div>
        </div>

        <div className="penalties">
          <h3>
            Notes des arbitres
          </h3>

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
                      {Number(note).toFixed(
                        1
                      )}
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
                          {valeur.toFixed(
                            1
                          )}
                        </option>
                      ))}
                    </select>

                    {index ===
                      resultatKata.indexMax && (
                      <p>
                        ⬆️ Note la plus
                        haute — retirée
                      </p>
                    )}

                    {index ===
                      resultatKata.indexMin && (
                      <p>
                        ⬇️ Note la plus
                        basse — retirée
                      </p>
                    )}

                    {!eliminee && (
                      <p>
                        ✅ Note retenue
                      </p>
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
              {resultatKata.noteMin.toFixed(
                1
              )}
            </strong>
          </p>

          <p>
            Note la plus haute retirée :{" "}
            <strong>
              {resultatKata.noteMax.toFixed(
                1
              )}
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
              {resultatKata.total.toFixed(
                1
              )}
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

  /*
   * =========================================================
   * AFFICHAGE JU RANDORI
   * =========================================================
   */

  return (
    <section className="match-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            JU RANDORI
          </p>

          <h2>
            Feuille de combat
          </h2>

          {eventType && (
            <p>{eventType}</p>
          )}
        </div>
      </div>

      {/* =====================================
          SCORE PRINCIPAL
      ===================================== */}

      <div className="match-score">
        <div>
          <strong>
            🔴 AKA
          </strong>

          <h2>
            {scoreFinalAka}
          </h2>

          <p>
            Assauts : {score.aka} ·
            Pénalités : -
            {pointsNegatifsAka}
          </p>

          <p>
            {match?.aka?.nom ||
              "Compétiteur AKA"}{" "}
            {match?.aka?.prenom || ""}
          </p>
        </div>

        <div>
          <strong>
            ⚪ SHIRO
          </strong>

          <h2>
            {scoreFinalShiro}
          </h2>

          <p>
            Assauts : {score.shiro} ·
            Pénalités : -
            {pointsNegatifsShiro}
          </p>

          <p>
            {match?.shiro?.nom ||
              "Compétiteur SHIRO"}{" "}
            {match?.shiro?.prenom || ""}
          </p>
        </div>
      </div>

      {/* =====================================
          PÉNALITÉS
      ===================================== */}

      <div className="penalties">
        <h3>Pénalités</h3>

        <div className="penalties-grid">
          <div className="penalty-card">
            <h3>
              🔴 AKA
            </h3>

            <p>
              Keikoku :{" "}
              {penalitesAka.keikoku}
              {" · "}
              Fujubun :{" "}
              {penalitesAka.fujubun}
              {" · "}
              Chui :{" "}
              {penalitesAka.chui}
              {" · "}
              Hansoku Chui :{" "}
              {
                penalitesAka.hansokuChui
              }
            </p>

            <p>
              Points négatifs :{" "}
              <strong>
                {pointsNegatifsAka}
              </strong>
            </p>

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
              onClick={() =>
                ajouterPenalite(
                  "aka",
                  "shikaku"
                )
              }
            >
              Shikaku
            </button>

            {penalitesAka.shikaku && (
              <strong>
                ⛔ SHIKAKU
              </strong>
            )}
          </div>

          <div className="penalty-card">
            <h3>
              ⚪ SHIRO
            </h3>

            <p>
              Keikoku :{" "}
              {penalitesShiro.keikoku}
              {" · "}
              Fujubun :{" "}
              {penalitesShiro.fujubun}
              {" · "}
              Chui :{" "}
              {penalitesShiro.chui}
              {" · "}
              Hansoku Chui :{" "}
              {
                penalitesShiro.hansokuChui
              }
            </p>

            <p>
              Points négatifs :{" "}
              <strong>
                {pointsNegatifsShiro}
              </strong>
            </p>

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
              onClick={() =>
                ajouterPenalite(
                  "shiro",
                  "shikaku"
                )
              }
            >
              Shikaku
            </button>

            {penalitesShiro.shikaku && (
              <strong>
                ⛔ SHIKAKU
              </strong>
            )}
          </div>
        </div>
      </div>

      {/* =====================================
          7 ASSAUTS
      ===================================== */}

      <div className="assauts">
        <h3>
          Assauts réglementaires
        </h3>

        {assauts.map(
          (assaut, index) => (
            <div
              className="assaut-card"
              key={index}
            >
              <h3>
                Assaut {index + 1}
              </h3>

              {[
                "juge1",
                "juge2",
                "juge3",
              ].map(
                (juge, jugeIndex) => (
                  <div
                    className="juge"
                    key={juge}
                  >
                    <span>
                      Fukushin{" "}
                      {jugeIndex + 1}
                    </span>

                    <button
                      type="button"
                      className={
                        assaut[juge] ===
                        "aka"
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
                      AKA
                    </button>

                    <button
                      type="button"
                      className={
                        assaut[juge] ===
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
                        assaut[juge] ===
                        "shiro"
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
                      SHIRO
                    </button>
                  </div>
                )
              )}
            </div>
          )
        )}
      </div>

      {/* =====================================
          DÉPARTAGE
      ===================================== */}

      {departageActif &&
        !akaDisqualifie &&
        !shiroDisqualifie && (
          <div className="assauts">
            <div className="beta-note">
              <strong>
                ⚖️ Égalité après les 7
                assauts
              </strong>

              <p>
                Score :{" "}
                <strong>
                  {scoreFinalAka} —{" "}
                  {scoreFinalShiro}
                </strong>
              </p>

              <p>
                Procéder aux trois
                techniques de départage :
                Tsuki, Mae Geri et Mawashi
                Geri.
              </p>
            </div>

            <h3>
              Départage Ju Randori
            </h3>

            {assautsDepartage.map(
              (assaut, index) => (
                <div
                  className="assaut-card"
                  key={
                    assaut.technique ||
                    index
                  }
                >
                  <p className="surtitle">
                    DÉPARTAGE
                  </p>

                  <h3>
                    {index + 1}.{" "}
                    {
                      assaut.technique
                    }
                  </h3>

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
                        <span>
                          Fukushin{" "}
                          {jugeIndex +
                            1}
                        </span>

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
                            modifierVoteDepartage(
                              index,
                              juge,
                              "aka"
                            )
                          }
                        >
                          AKA
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
                          SHIRO
                        </button>
                      </div>
                    )
                  )}
                </div>
              )
            )}

            <div className="match-score">
              <div>
                <strong>
                  🔴 AKA
                </strong>

                <h2>
                  {
                    scoreDepartage.aka
                  }
                </h2>

                <p>
                  Score départage
                </p>
              </div>

              <div>
                <strong>
                  ⚪ SHIRO
                </strong>

                <h2>
                  {
                    scoreDepartage.shiro
                  }
                </h2>

                <p>
                  Score départage
                </p>
              </div>
            </div>

            {!departageComplet && (
              <div className="beta-note">
                <strong>
                  Départage en cours
                </strong>

                <p>
                  Renseigne les votes
                  des trois Fukushin pour
                  les trois techniques.
                </p>
              </div>
            )}

            {departageComplet &&
              vainqueurDepartage ===
                "aka" && (
                <div className="beta-note">
                  <strong>
                    🏆 AKA vainqueur
                  </strong>

                  <p>
                    Victoire après
                    départage.
                  </p>
                </div>
              )}

            {departageComplet &&
              vainqueurDepartage ===
                "shiro" && (
                <div className="beta-note">
                  <strong>
                    🏆 SHIRO vainqueur
                  </strong>

                  <p>
                    Victoire après
                    départage.
                  </p>
                </div>
              )}

            {/* =================================
                ÉGALITÉ PERSISTANTE
            ================================= */}

            {egaliteApresDepartage && (
              <div className="competition-form">
                <p className="surtitle">
                  ÉGALITÉ PERSISTANTE
                </p>

                <h3>
                  Décision aux drapeaux
                </h3>

                <p>
                  Le score reste à égalité
                  après les trois
                  techniques de départage.
                </p>

                <p>
                  L'équipe d'arbitrage
                  doit désigner le
                  vainqueur.
                </p>

                <div className="competition-actions">
                  <button
                    type="button"
                    className={
                      decisionDrapeaux ===
                      "aka"
                        ? "vote-button selected aka"
                        : "vote-button"
                    }
                    onClick={() =>
                      setDecisionDrapeaux(
                        "aka"
                      )
                    }
                  >
                    🔴 AKA vainqueur
                  </button>

                  <button
                    type="button"
                    className={
                      decisionDrapeaux ===
                      "shiro"
                        ? "vote-button selected shiro"
                        : "vote-button"
                    }
                    onClick={() =>
                      setDecisionDrapeaux(
                        "shiro"
                      )
                    }
                  >
                    ⚪ SHIRO vainqueur
                  </button>
                </div>

                {decisionDrapeaux && (
                  <div className="match-result">
                    <p>
                      🏁 Décision aux
                      drapeaux
                    </p>

                    <strong>
                      🏆{" "}
                      {decisionDrapeaux ===
                      "aka"
                        ? "AKA"
                        : "SHIRO"}{" "}
                      vainqueur
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* =====================================
          RÉSULTAT FINAL
      ===================================== */}

      <div className="match-result">
        <h3>
          Résultat
        </h3>

        <p>
          AKA :{" "}
          <strong>
            {scoreFinalAka}
          </strong>
          {" — "}
          SHIRO :{" "}
          <strong>
            {scoreFinalShiro}
          </strong>
        </p>

        {akaDisqualifie &&
          !shiroDisqualifie && (
            <div className="beta-note">
              <strong>
                🏆 SHIRO vainqueur
              </strong>

              <p>
                AKA est disqualifié.
              </p>
            </div>
          )}

        {shiroDisqualifie &&
          !akaDisqualifie && (
            <div className="beta-note">
              <strong>
                🏆 AKA vainqueur
              </strong>

              <p>
                SHIRO est disqualifié.
              </p>
            </div>
          )}

        {akaDisqualifie &&
          shiroDisqualifie && (
            <div className="beta-note">
              <strong>
                ⛔ Double
                disqualification
              </strong>

              <p>
                Le combat ne peut pas
                être enregistré avec un
                vainqueur automatique.
              </p>
            </div>
          )}

        {!departageActif &&
          !akaDisqualifie &&
          !shiroDisqualifie &&
          vainqueurNormal === "aka" && (
            <div className="beta-note">
              <strong>
                🏆 AKA vainqueur
              </strong>

              <p>
                Victoire au score.
              </p>
            </div>
          )}

        {!departageActif &&
          !akaDisqualifie &&
          !shiroDisqualifie &&
          vainqueurNormal ===
            "shiro" && (
            <div className="beta-note">
              <strong>
                🏆 SHIRO vainqueur
              </strong>

              <p>
                Victoire au score.
              </p>
            </div>
          )}

        {decisionType ===
          "departage" &&
          vainqueurOfficiel && (
            <div className="beta-note">
              <strong>
                🏆{" "}
                {vainqueurOfficiel ===
                "aka"
                  ? "AKA"
                  : "SHIRO"}{" "}
                vainqueur
              </strong>

              <p>
                Victoire après départage
                Tsuki / Mae Geri /
                Mawashi Geri.
              </p>
            </div>
          )}

        {decisionType ===
          "drapeaux" &&
          vainqueurOfficiel && (
            <div className="beta-note">
              <strong>
                🏆{" "}
                {vainqueurOfficiel ===
                "aka"
                  ? "AKA"
                  : "SHIRO"}{" "}
                vainqueur
              </strong>

              <p>
                🏁 Décision aux drapeaux
                après égalité persistante.
              </p>
            </div>
          )}

        {/* =====================================
            ENREGISTREMENT
        ===================================== */}

        {onSave && (
          <button
            type="button"
            className="primary"
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
              ? departageActif &&
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
        )}
      </div>
    </section>
  );
}

export default MatchManager;
