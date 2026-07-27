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

  return (
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
          <h2>{score.aka}</h2>
          <p>{match?.aka?.nom || "Compétiteur AKA"}</p>
        </div>

        <div>
          <strong>⚪ SHIRO</strong>
          <h2>{score.shiro}</h2>
          <p>{match?.shiro?.nom || "Compétiteur SHIRO"}</p>
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
                scoreAka: score.aka,
                scoreShiro: score.shiro,
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
