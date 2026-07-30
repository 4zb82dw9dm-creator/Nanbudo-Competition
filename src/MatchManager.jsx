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
   * KATA
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
     * Si toutes les notes sont identiques,
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
   * JU RANDORI — ASSAUTS
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
   * JU RANDORI — DÉCISION AUX DRAPEAUX
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
     * Si le combat est modifié, l'ancienne
     * décision aux drapeaux n'est plus valable.
     */
    setDecisionDrapeaux("");
  }

  /*
   * =========================================================
   * CALCUL DU SCORE
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
   * GESTION DES PÉNALITÉS
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

    /*
     * Une modification des pénalités peut
     * changer le résultat du combat.
     */
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
   * DÉTERMINATION AUTOMATIQUE DU VAINQUEUR
   * =========================================================
   */

  function determinerVainqueur() {
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

    /*
     * Si les deux sont disqualifiés,
     * aucun vainqueur automatique.
     */
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

  const vainqueurAutomatique =
    determinerVainqueur();

  /*
   * Une égalité nécessitant les drapeaux
   * existe uniquement si aucun combattant
   * n'est disqualifié et que les scores
   * restent identiques.
   */

  const egaliteAResoudre =
    !akaDisqualifie &&
    !shiroDisqualifie &&
    vainqueurAutomatique === null;

  /*
   * Vainqueur réellement enregistré.
   */

  const vainqueurOfficiel =
    vainqueurAutomatique ||
    (egaliteAResoudre &&
    decisionDrapeaux
      ? decisionDrapeaux
      : null);

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

    return (
      <section className="match-manager">
        <div className="manager-header">
          <div>
            <p className="surtitle">
              KATA
            </p>

            <h2>
              Feuille de notation
            </h2>

            <p>
              {competiteur
                ? `${competiteur.nom || ""} ${
                    competiteur.prenom || ""
                  }`
                : "Compétiteur"}
            </p>

            {passage && (
              <p>
                Passage {passage}
              </p>
            )}
          </div>
        </div>

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
            {notesKata.map((note, index) => {
              const eliminee =
                index === resultatKata.indexMax ||
                index === resultatKata.indexMin;

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
                    <p>
                      ✅ Note retenue
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="match-result">
          <h3>
            Résultat
          </h3>

          <p>
            Notes :{" "}
            {resultatKata.notes
              .map((note) => note.toFixed(1))
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
                .map((note) => note.toFixed(1))
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
              {initialResult
                ? `Enregistrer les modifications du passage ${
                    passage || ""
                  }`
                : `Enregistrer le passage ${
                    passage || ""
                  }`}
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
            <p>
              {eventType}
            </p>
          )}
        </div>
      </div>

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
            Pénalités : -{pointsNegatifsAka}
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
            Pénalités : -{pointsNegatifsShiro}
          </p>

          <p>
            {match?.shiro?.nom ||
              "Compétiteur SHIRO"}{" "}
            {match?.shiro?.prenom || ""}
          </p>
        </div>
      </div>

      {/* =====================================================
          PÉNALITÉS
      ===================================================== */}

      <div className="penalties">
        <h3>
          Pénalités
        </h3>

        <div className="penalties-grid">
          <div className="penalty-card">
            <h3>
              🔴 AKA
            </h3>

            <p>
              Keikoku : {penalitesAka.keikoku}
              {" · "}
              Fujubun : {penalitesAka.fujubun}
              {" · "}
              Chui : {penalitesAka.chui}
              {" · "}
              Hansoku Chui :{" "}
              {penalitesAka.hansokuChui}
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
              Keikoku : {penalitesShiro.keikoku}
              {" · "}
              Fujubun : {penalitesShiro.fujubun}
              {" · "}
              Chui : {penalitesShiro.chui}
              {" · "}
              Hansoku Chui :{" "}
              {penalitesShiro.hansokuChui}
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

      {/* =====================================================
          ASSAUTS
      ===================================================== */}

      <div className="assauts">
        {assauts.map((assaut, index) => (
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
            ].map((juge, jugeIndex) => (
              <div
                className="juge"
                key={juge}
              >
                <span>
                  Fukushin {jugeIndex + 1}
                </span>

                <button
                  type="button"
                  className={
                    assaut[juge] === "aka"
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
                    assaut[juge] === "shiro"
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
            ))}
          </div>
        ))}
      </div>

      {/* =====================================================
          RÉSULTAT
      ===================================================== */}

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

        {/* DISQUALIFICATION AKA */}

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

        {/* DISQUALIFICATION SHIRO */}

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

        {/* DOUBLE DISQUALIFICATION */}

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

        {/* VICTOIRE AUTOMATIQUE AKA */}

        {!akaDisqualifie &&
          !shiroDisqualifie &&
          vainqueurAutomatique === "aka" && (
            <div className="beta-note">
              <strong>
                🏆 AKA vainqueur
              </strong>

              <p>
                Victoire au score.
              </p>
            </div>
          )}

        {/* VICTOIRE AUTOMATIQUE SHIRO */}

        {!akaDisqualifie &&
          !shiroDisqualifie &&
          vainqueurAutomatique === "shiro" && (
            <div className="beta-note">
              <strong>
                🏆 SHIRO vainqueur
              </strong>

              <p>
                Victoire au score.
              </p>
            </div>
          )}

        {/* ===================================================
            ÉGALITÉ — DÉCISION AUX DRAPEAUX
        =================================================== */}

        {egaliteAResoudre && (
          <div className="beta-note">
            <strong>
              🏁 Égalité — décision des arbitres requise
            </strong>

            <p>
              Le score est de{" "}
              <strong>
                {scoreFinalAka} — {scoreFinalShiro}
              </strong>.
            </p>

            <p>
              Désigne le vainqueur conformément
              à la décision arbitrale.
            </p>

            <div className="competition-actions">
              <button
                type="button"
                className={
                  decisionDrapeaux === "aka"
                    ? "vote-button selected aka"
                    : "vote-button"
                }
                onClick={() =>
                  setDecisionDrapeaux("aka")
                }
              >
                🔴 AKA vainqueur
              </button>

              <button
                type="button"
                className={
                  decisionDrapeaux === "shiro"
                    ? "vote-button selected shiro"
                    : "vote-button"
                }
                onClick={() =>
                  setDecisionDrapeaux("shiro")
                }
              >
                ⚪ SHIRO vainqueur
              </button>
            </div>

            {decisionDrapeaux && (
              <div className="match-result">
                <p>
                  🏁 Décision aux drapeaux
                </p>

                <strong>
                  🏆{" "}
                  {decisionDrapeaux === "aka"
                    ? "AKA"
                    : "SHIRO"}{" "}
                  vainqueur
                </strong>
              </div>
            )}
          </div>
        )}

        {/* ===================================================
            ENREGISTREMENT
        =================================================== */}

        {onSave && (
          <button
            type="button"
            className="primary"
            disabled={!vainqueurOfficiel}
            onClick={() => {
              if (!vainqueurOfficiel) {
                return;
              }

              onSave({
                type: "ju-randori",

                assauts,

                scoreBrutAka:
                  score.aka,

                scoreBrutShiro:
                  score.shiro,

                scoreAka:
                  scoreFinalAka,

                scoreShiro:
                  scoreFinalShiro,

                penalitesAka,

                penalitesShiro,

                pointsNegatifsAka,

                pointsNegatifsShiro,

                akaDisqualifie,

                shiroDisqualifie,

                vainqueur:
                  vainqueurOfficiel,

                decisionType:
                  egaliteAResoudre
                    ? "drapeaux"
                    : akaDisqualifie ||
                      shiroDisqualifie
                    ? "disqualification"
                    : "score",

                decisionDrapeaux:
                  egaliteAResoudre
                    ? decisionDrapeaux
                    : null,
              });
            }}
          >
            {egaliteAResoudre &&
            !decisionDrapeaux
              ? "Désigner un vainqueur avant d'enregistrer"
              : match?.statut === "Terminé"
              ? "Enregistrer les modifications"
              : "Enregistrer le combat"}
          </button>
        )}
      </div>
    </section>
  );
}

export default MatchManager;
