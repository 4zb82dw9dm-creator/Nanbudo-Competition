import { useState } from "react";

const EVENT_LABELS = {
  kata0: "Kata 0 — Shihotai",
  kata1: "Kata 1",
  kata2: "Kata 2",
  randori: "Randori",
  juRandori1: "Ju Randori 1",
  juRandori2: "Ju Randori 2",
};

const KATA_NOTES = [
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
];

function MatchManager({
  match,
  onSave,
  mode = "combat",
  eventType = "",
  competitor = null,
  passage = null,
  initialResult = null,
}) {
  /*
   * =========================================================
   * OUTILS
   * =========================================================
   */

  function getEventLabel(type) {
    return EVENT_LABELS[type] || type || "Épreuve";
  }

  /*
   * =========================================================
   * KATA
   * =========================================================
   */

  const [notesKata, setNotesKata] = useState(() => {
    if (
      initialResult?.notes &&
      Array.isArray(initialResult.notes) &&
      initialResult.notes.length === 5
    ) {
      return initialResult.notes.map((note) =>
        Number(note)
      );
    }

    return [
      4.5,
      4.5,
      4.5,
      4.5,
      4.5,
    ];
  });

  function modifierNoteKata(index, valeur) {
    let nombre = Number(valeur);

    if (Number.isNaN(nombre)) {
      nombre = 4.5;
    }

    if (nombre < 3.9) {
      nombre = 3.9;
    }

    if (nombre > 4.9) {
      nombre = 4.9;
    }

    nombre = Number(nombre.toFixed(1));

    setNotesKata((actuelles) =>
      actuelles.map((note, i) =>
        i === index ? nombre : note
      )
    );
  }

  function calculerKata() {
    const notes = notesKata.map((note) =>
      Number(note)
    );

    /*
     * On retire exactement UNE note haute
     * et UNE note basse.
     *
     * Si plusieurs juges donnent la même
     * note haute ou basse, une seule note
     * est retirée.
     */

    let indexMax = 0;

    for (
      let index = 1;
      index < notes.length;
      index++
    ) {
      if (notes[index] > notes[indexMax]) {
        indexMax = index;
      }
    }

    let indexMin = null;

    for (
      let index = 0;
      index < notes.length;
      index++
    ) {
      if (index === indexMax) {
        continue;
      }

      if (
        indexMin === null ||
        notes[index] < notes[indexMin]
      ) {
        indexMin = index;
      }
    }

    const noteMax =
      notes[indexMax];

    const noteMin =
      indexMin !== null
        ? notes[indexMin]
        : null;

    const notesRetenues =
      notes.filter(
        (_, index) =>
          index !== indexMax &&
          index !== indexMin
      );

    const total =
      notesRetenues.reduce(
        (somme, note) =>
          somme + note,
        0
      );

    return {
      notes,
      indexMax,
      indexMin,
      noteMax,
      noteMin,
      notesRetenues,
      total: Number(
        total.toFixed(1)
      ),
    };
  }

  const resultatKata =
    calculerKata();

  /*
   * =========================================================
   * JU RANDORI
   * =========================================================
   */

  const [assauts, setAssauts] = useState(
    Array.from(
      { length: 7 },
      () => ({
        juge1: "",
        juge2: "",
        juge3: "",
      })
    )
  );

  const [
    penalitesAka,
    setPenalitesAka,
  ] = useState({
    keikoku: 0,
    fujubun: 0,
    chui: 0,
    hansokuChui: 0,
    shikaku: false,
  });

  const [
    penalitesShiro,
    setPenalitesShiro,
  ] = useState({
    keikoku: 0,
    fujubun: 0,
    chui: 0,
    hansokuChui: 0,
    shikaku: false,
  });

  function modifierVote(
    numeroAssaut,
    juge,
    valeur
  ) {
    setAssauts((actuels) =>
      actuels.map(
        (assaut, index) =>
          index === numeroAssaut
            ? {
                ...assaut,
                [juge]: valeur,
              }
            : assaut
      )
    );
  }

  function calculerScore() {
    let aka = 0;
    let shiro = 0;

    assauts.forEach((assaut) => {
      Object.values(
        assaut
      ).forEach((vote) => {
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

  const score =
    calculerScore();

  function ajouterPenalite(
    couleur,
    type
  ) {
    const setter =
      couleur === "aka"
        ? setPenalitesAka
        : setPenalitesShiro;

    setter((actuelles) => {
      const nouvelles = {
        ...actuelles,
      };

      if (type === "shikaku") {
        nouvelles.shikaku = true;

        return nouvelles;
      }

      if (type === "keikoku") {
        nouvelles.keikoku += 1;

        if (
          nouvelles.keikoku >= 3
        ) {
          nouvelles.keikoku = 0;
          nouvelles.fujubun += 1;
        }
      }

      if (type === "fujubun") {
        nouvelles.fujubun += 1;
      }

      if (type === "chui") {
        nouvelles.chui += 1;
      }

      if (
        type === "hansokuChui"
      ) {
        nouvelles.hansokuChui += 1;
      }

      if (
        nouvelles.fujubun >= 3
      ) {
        nouvelles.fujubun = 0;
        nouvelles.hansokuChui += 1;
      }

      return nouvelles;
    });
  }

  function calculerPointsNegatifs(
    penalites
  ) {
    return (
      penalites.fujubun +
      penalites.chui * 2 +
      penalites.hansokuChui * 3
    );
  }

  const pointsNegatifsAka =
    calculerPointsNegatifs(
      penalitesAka
    );

  const pointsNegatifsShiro =
    calculerPointsNegatifs(
      penalitesShiro
    );

  const scoreFinalAka =
    score.aka -
    pointsNegatifsAka;

  const scoreFinalShiro =
    score.shiro -
    pointsNegatifsShiro;

  const akaDisqualifie =
    penalitesAka.hansokuChui >
      0 ||
    penalitesAka.shikaku;

  const shiroDisqualifie =
    penalitesShiro.hansokuChui >
      0 ||
    penalitesShiro.shikaku;

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

  const vainqueur =
    determinerVainqueur();

  /*
   * =========================================================
   * AFFICHAGE KATA
   * =========================================================
   */

  if (mode === "kata") {
    return (
      <section className="match-manager">
        <div className="manager-header">
          <div>
            <p className="surtitle">
              {getEventLabel(
                eventType
              )}
            </p>

            <h2>
              Feuille de notation
            </h2>

            <p>
              {competitor
                ? `${
                    competitor.nom ||
                    ""
                  } ${
                    competitor.prenom ||
                    ""
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
              NOTE DU PASSAGE
            </strong>

            <h2>
              {resultatKata.total.toFixed(
                1
              )}
            </h2>

            <p>
              Somme des 3 notes
              retenues
            </p>
          </div>
        </div>

        <div className="penalties">
          <h3>
            Notes des 5 juges
          </h3>

          <p>
            Chaque juge attribue une
            note comprise entre 3,9 et
            4,9. La note la plus haute
            et la note la plus basse
            sont retirées.
          </p>

          <div className="penalties-grid">
            {notesKata.map(
              (note, index) => {
                const noteHaute =
                  index ===
                  resultatKata.indexMax;

                const noteBasse =
                  index ===
                  resultatKata.indexMin;

                const eliminee =
                  noteHaute ||
                  noteBasse;

                return (
                  <div
                    className="penalty-card"
                    key={index}
                  >
                    <h3>
                      Juge {index + 1}
                    </h3>

                    <h2>
                      {Number(
                        note
                      ).toFixed(1)}
                    </h2>

                    <input
                      type="range"
                      min="3.9"
                      max="4.9"
                      step="0.1"
                      value={note}
                      onChange={(
                        event
                      ) =>
                        modifierNoteKata(
                          index,
                          event
                            .target
                            .value
                        )
                      }
                    />

                    <select
                      value={note}
                      onChange={(
                        event
                      ) =>
                        modifierNoteKata(
                          index,
                          event
                            .target
                            .value
                        )
                      }
                    >
                      {KATA_NOTES.map(
                        (valeur) => (
                          <option
                            key={
                              valeur
                            }
                            value={
                              valeur
                            }
                          >
                            {valeur.toFixed(
                              1
                            )}
                          </option>
                        )
                      )}
                    </select>

                    {noteHaute && (
                      <p>
                        ⬆️ Note la plus
                        haute — retirée
                      </p>
                    )}

                    {noteBasse && (
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
            Résultat du passage
          </h3>

          <p>
            Notes des juges :{" "}
            <strong>
              {resultatKata.notes
                .map((note) =>
                  note.toFixed(1)
                )
                .join(" · ")}
            </strong>
          </p>

          <p>
            Note haute retirée :{" "}
            <strong>
              {resultatKata.noteMax.toFixed(
                1
              )}
            </strong>
          </p>

          <p>
            Note basse retirée :{" "}
            <strong>
              {resultatKata.noteMin.toFixed(
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
            Total du passage :{" "}
            <strong>
              {resultatKata.total.toFixed(
                1
              )}
            </strong>
          </p>

          {initialResult && (
            <p>
              Ce passage a déjà été
              enregistré. Tu peux
              modifier les notes puis
              l'enregistrer à nouveau.
            </p>
          )}

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

                  noteRetireeHaute:
                    resultatKata.noteMax,

                  noteRetireeBasse:
                    resultatKata.noteMin,

                  total:
                    resultatKata.total,
                })
              }
            >
              {initialResult
                ? `Modifier le passage ${
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
   * AFFICHAGE COMBAT
   * =========================================================
   */

  return (
    <section className="match-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            {getEventLabel(
              eventType
            )}
          </p>

          <h2>
            Feuille de combat
          </h2>
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
            Pénalités : -
            {pointsNegatifsAka}
          </p>

          <p>
            {match?.aka
              ? `${
                  match.aka.nom ||
                  ""
                } ${
                  match.aka.prenom ||
                  ""
                }`
              : "Compétiteur AKA"}
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
            {match?.shiro
              ? `${
                  match.shiro.nom ||
                  ""
                } ${
                  match.shiro.prenom ||
                  ""
                }`
              : "Compétiteur SHIRO"}
          </p>
        </div>
      </div>

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

      <div className="assauts">
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
                      {jugeIndex + 1}
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
                        ] ===
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

      <div className="match-result">
        <h3>
          Résultat provisoire
        </h3>

        <p>
          AKA :{" "}
          <strong>
            {score.aka}
          </strong>
          {" — "}
          SHIRO :{" "}
          <strong>
            {score.shiro}
          </strong>
        </p>

        <p>
          Score après pénalités :
          {" "}
          <strong>
            {scoreFinalAka}
          </strong>
          {" — "}
          <strong>
            {scoreFinalShiro}
          </strong>
        </p>

        <p>
          {akaDisqualifie &&
            !shiroDisqualifie && (
              <>
                ⛔ AKA disqualifié ·
                🏆 SHIRO vainqueur
              </>
            )}

          {shiroDisqualifie &&
            !akaDisqualifie && (
              <>
                ⛔ SHIRO disqualifié ·
                🏆 AKA vainqueur
              </>
            )}

          {akaDisqualifie &&
            shiroDisqualifie && (
              <>
                ⛔ Les deux
                compétiteurs sont
                disqualifiés
              </>
            )}

          {!akaDisqualifie &&
            !shiroDisqualifie &&
            vainqueur === "aka" && (
              <>
                🏆 AKA vainqueur
              </>
            )}

          {!akaDisqualifie &&
            !shiroDisqualifie &&
            vainqueur ===
              "shiro" && (
              <>
                🏆 SHIRO vainqueur
              </>
            )}

          {!akaDisqualifie &&
            !shiroDisqualifie &&
            vainqueur === null && (
              <>
                Égalité
              </>
            )}
        </p>

        {onSave && (
          <button
            type="button"
            className="primary"
            onClick={() =>
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

                vainqueur,
              })
            }
          >
            Enregistrer le combat
          </button>
        )}
      </div>
    </section>
  );
}

export default MatchManager;
