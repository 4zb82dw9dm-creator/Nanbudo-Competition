import { useState } from "react";

function MatchManager({ match, onSave }) {
  const [assauts, setAssauts] = useState(
    Array.from({ length: 7 }, () => ({
      juge1: "",
      juge2: "",
      juge3: "",
    }))
  );

  function modifierVote(numeroAssaut, juge, valeur) {
    setAssauts((actuels) =>
      actuels.map((assaut, index) =>
        index === numeroAssaut
          ? { ...assaut, [juge]: valeur }
          : assaut
      )
    );
  }

  function calculerScore() {
    let aka = 0;
    let shiro = 0;

    assauts.forEach((assaut) => {
      Object.values(assaut).forEach((vote) => {
        if (vote === "aka") aka += 1;
        if (vote === "shiro") shiro += 1;

        if (vote === "hikiwake") {
          aka += 1;
          shiro += 1;
        }
      });
    });

    return { aka, shiro };
  }

  const score = calculerScore();
const [penalitesAka, setPenalitesAka] = useState({
  keikoku: 0,
  fujubun: 0,
  chui: 0,
  hansokuChui: 0,
  shikaku: false,
});

const [penalitesShiro, setPenalitesShiro] = useState({
  keikoku: 0,
  fujubun: 0,
  chui: 0,
  hansokuChui: 0,
  shikaku: false,
});

function ajouterPenalite(couleur, type) {
  const setter =
    couleur === "aka"
      ? setPenalitesAka
      : setPenalitesShiro;

  setter((actuelles) => {
    const nouvelles = { ...actuelles };

    if (type === "shikaku") {
      nouvelles.shikaku = true;
      return nouvelles;
    }

    if (type === "keikoku") {
      nouvelles.keikoku += 1;

      // 3 Keikoku = 1 Fujubun
      if (nouvelles.keikoku >= 3) {
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

    if (type === "hansokuChui") {
      nouvelles.hansokuChui += 1;
    }

    // En Ju Randori individuel :
    // 3 Fujubun = Hansoku Chui
    if (nouvelles.fujubun >= 3) {
      nouvelles.fujubun = 0;
      nouvelles.hansokuChui += 1;
    }

    return nouvelles;
  });
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
  score.shiro - pointsNegatifsShiro; const akaDisqualifie =
  penalitesAka.hansokuChui > 0 ||
  penalitesAka.shikaku;

const shiroDisqualifie =
  penalitesShiro.hansokuChui > 0 ||
  penalitesShiro.shikaku;

function determinerVainqueur() {
  if (akaDisqualifie && !shiroDisqualifie) {
    return "shiro";
  }

  if (shiroDisqualifie && !akaDisqualifie) {
    return "aka";
  }

  if (akaDisqualifie && shiroDisqualifie) {
    return null;
  }

  if (scoreFinalAka > scoreFinalShiro) {
    return "aka";
  }

  if (scoreFinalShiro > scoreFinalAka) {
    return "shiro";
  }

  return null;
}

const vainqueur = determinerVainqueur(); return (
    <section className="match-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">JU RANDORI</p>
          <h2>Feuille de combat</h2>
        </div>
      </div>

      <div className="match-score">
        <div>
          <strong>🔴 AKA</strong>
          <h2>{scoreFinalAka}</h2>
<p>
  Assauts : {score.aka} · Pénalités : -{pointsNegatifsAka}
</p>          <p>{match?.aka?.nom || "Compétiteur AKA"}</p>
        </div>

        <div>
          <strong>⚪ SHIRO</strong>
          <h2>{scoreFinalShiro}</h2>
<p>
  Assauts : {score.shiro} · Pénalités : -{pointsNegatifsShiro}
</p>          <p>{match?.shiro?.nom || "Compétiteur SHIRO"}</p>
        </div>
      </div>
      <div className="penalties">
        <h3>Pénalités</h3>

        <div className="penalties-grid">
          <div className="penalty-card">
            <h3>🔴 AKA</h3>

            <p>
              Keikoku : {penalitesAka.keikoku}
              {" · "}
              Fujubun : {penalitesAka.fujubun}
              {" · "}
              Chui : {penalitesAka.chui}
              {" · "}
              Hansoku Chui : {penalitesAka.hansokuChui}
            </p>

            <p>
              Points négatifs : <strong>{pointsNegatifsAka}</strong>
            </p>

            <button
              type="button"
              onClick={() => ajouterPenalite("aka", "keikoku")}
            >
              + Keikoku
            </button>

            <button
              type="button"
              onClick={() => ajouterPenalite("aka", "fujubun")}
            >
              + Fujubun
            </button>

            <button
              type="button"
              onClick={() => ajouterPenalite("aka", "chui")}
            >
              + Chui
            </button>

            <button
              type="button"
              onClick={() => ajouterPenalite("aka", "hansokuChui")}
            >
              + Hansoku Chui
            </button>

            <button
              type="button"
              onClick={() => ajouterPenalite("aka", "shikaku")}
            >
              Shikaku
            </button>

            {penalitesAka.shikaku && (
              <strong>⛔ SHIKAKU</strong>
            )}
          </div>

          <div className="penalty-card">
            <h3>⚪ SHIRO</h3>

            <p>
              Keikoku : {penalitesShiro.keikoku}
              {" · "}
              Fujubun : {penalitesShiro.fujubun}
              {" · "}
              Chui : {penalitesShiro.chui}
              {" · "}
              Hansoku Chui : {penalitesShiro.hansokuChui}
            </p>

            <p>
              Points négatifs : <strong>{pointsNegatifsShiro}</strong>
            </p>

            <button
              type="button"
              onClick={() => ajouterPenalite("shiro", "keikoku")}
            >
              + Keikoku
            </button>

            <button
              type="button"
              onClick={() => ajouterPenalite("shiro", "fujubun")}
            >
              + Fujubun
            </button>

            <button
              type="button"
              onClick={() => ajouterPenalite("shiro", "chui")}
            >
              + Chui
            </button>

            <button
              type="button"
              onClick={() => ajouterPenalite("shiro", "hansokuChui")}
            >
              + Hansoku Chui
            </button>

            <button
              type="button"
              onClick={() => ajouterPenalite("shiro", "shikaku")}
            >
              Shikaku
            </button>

            {penalitesShiro.shikaku && (
              <strong>⛔ SHIKAKU</strong>
            )}
          </div>
        </div>
      </div>

          <div className="assauts">
        {assauts.map((assaut, index) => (
          <div className="assaut-card" key={index}>
            <h3>Assaut {index + 1}</h3>

            {["juge1", "juge2", "juge3"].map((juge, jugeIndex) => (
              <div className="juge" key={juge}>
                <span>Fukushin {jugeIndex + 1}</span>

              <button
  type="button"
  className={assaut[juge] === "aka" ? "vote-button selected aka" : "vote-button"}
  onClick={() => modifierVote(index, juge, "aka")}
>
  AKA
</button>

<button
  type="button"
  className={assaut[juge] === "hikiwake" ? "vote-button selected hikiwake" : "vote-button"}
  onClick={() => modifierVote(index, juge, "hikiwake")}
>
  Hikiwake
</button>

<button
  type="button"
  className={assaut[juge] === "shiro" ? "vote-button selected shiro" : "vote-button"}
  onClick={() => modifierVote(index, juge, "shiro")}
>
  SHIRO
</button>              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="match-result">
        <h3>Résultat provisoire</h3>

        <p>
          AKA : <strong>{score.aka}</strong>
          {" — "}
          SHIRO : <strong>{score.shiro}</strong>
        </p>

        <p>
          {score.aka > score.shiro && "🔴 AKA est en tête"}
          {score.shiro > score.aka && "⚪ SHIRO est en tête"}
          {score.aka === score.shiro && "Égalité"}
        </p>

        {onSave && (
          <button
            type="button"
            className="primary"
            onClick={() =>
  onSave({
    assauts,

    scoreBrutAka: score.aka,
    scoreBrutShiro: score.shiro,

    scoreAka: scoreFinalAka,
    scoreShiro: scoreFinalShiro,

    penalitesAka,
    penalitesShiro,

    pointsNegatifsAka,
    pointsNegatifsShiro,

    akaDisqualifie,
    shiroDisqualifie,

    vainqueur,
  })
}          >
            Enregistrer le combat
          </button>
        )}
      </div>
    </section>
  );
}

export default MatchManager;
