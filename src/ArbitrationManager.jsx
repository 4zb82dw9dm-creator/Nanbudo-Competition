import { useState } from "react";
import MatchManager from "./MatchManager";

function ArbitrationManager({
  competition,
  onUpdateCompetition,
}) {  const pools = competition.pools || [];
  const competitors = competition.competitors || [];

  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [akaScore, setAkaScore] = useState("");
  const [shiroScore, setShiroScore] = useState("");

  function getCompetitor(id) {
    return competitors.find(
      (competitor) => competitor.id === id
    );
  }

  const selectedPool = pools.find(
    (pool) => String(pool.id) === String(selectedPoolId)
  );

  const selectedMatch = selectedPool?.matches.find(
    (match) => String(match.id) === String(selectedMatchId)
  );

  function selectMatch(match) {
    setSelectedMatchId(match.id);

    setAkaScore(
      match.akaScore === null ? "" : match.akaScore
    );

    setShiroScore(
      match.shiroScore === null ? "" : match.shiroScore
    );
  }

  function saveResult() {
    if (!selectedPool || !selectedMatch) {
      alert("Sélectionne une rencontre.");
      return;
    }

    if (akaScore === "" || shiroScore === "") {
      alert("Saisis les deux scores.");
      return;
    }

    const aka = Number(akaScore);
    const shiro = Number(shiroScore);

    if (
      Number.isNaN(aka) ||
      Number.isNaN(shiro)
    ) {
      alert("Les scores doivent être numériques.");
      return;
    }

    let winnerId = null;

    if (aka > shiro) {
      winnerId = selectedMatch.akaId;
    }

    if (shiro > aka) {
      winnerId = selectedMatch.shiroId;
    }

    const updatedPools = pools.map((pool) => {
      if (pool.id !== selectedPool.id) {
        return pool;
      }

      return {
        ...pool,

        matches: pool.matches.map((match) => {
          if (match.id !== selectedMatch.id) {
            return match;
          }

          return {
            ...match,
            akaScore: aka,
            shiroScore: shiro,
            winnerId,
            statut: "Terminé",
          };
        }),
      };
    });

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedMatchId("");
    setAkaScore("");
    setShiroScore("");
  }

  function saveOfficialMatch(result) {
  if (!selectedPool || !selectedMatch) return;

  const winnerId =
    result.scoreAka > result.scoreShiro
      ? selectedMatch.akaId
      : result.scoreShiro > result.scoreAka
        ? selectedMatch.shiroId
        : null;

  const updatedPools = pools.map((pool) => {
    if (pool.id !== selectedPool.id) return pool;

    return {
      ...pool,
      matches: pool.matches.map((match) => {
        if (match.id !== selectedMatch.id) return match;

        return {
          ...match,
          assauts: result.assauts,
          akaScore: result.scoreAka,
          shiroScore: result.scoreShiro,
          winnerId,
          statut: "Terminé",
        };
      }),
    };
  });

  onUpdateCompetition({
    ...competition,
    pools: updatedPools,
  });

  setSelectedMatchId("");
}
  return (
    <div className="arbitration-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">AIRE DE COMBAT</p>

          <h2>Arbitrage</h2>

          <p>
            Sélection d'une poule et saisie des résultats
            des rencontres.
          </p>
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="empty-state">
          <h3>Aucune poule disponible</h3>

          <p>
            Génère d'abord les poules avant de commencer
            l'arbitrage.
          </p>
        </div>
      ) : (
        <>
          <div className="competition-form">
            <label>
              Poule

              <select
                value={selectedPoolId}
                onChange={(event) => {
                  setSelectedPoolId(event.target.value);
                  setSelectedMatchId("");
                  setAkaScore("");
                  setShiroScore("");
                }}
              >
                <option value="">
                  Sélectionner une poule
                </option>

                {pools.map((pool) => (
                  <option
                    key={pool.id}
                    value={pool.id}
                  >
                    {pool.nom}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedPool && (
            <section className="category-section">
              <div className="category-section-header">
                <div>
                  <p className="surtitle">RENCONTRES</p>

                  <h3>{selectedPool.nom}</h3>
                </div>

                <span className="status">
                  {
                    selectedPool.matches.filter(
                      (match) =>
                        match.statut === "Terminé"
                    ).length
                  }
                  /{selectedPool.matches.length} terminées
                </span>
              </div>

              <div className="competition-list">
                {selectedPool.matches.map(
                  (match, index) => {
                    const aka = getCompetitor(
                      match.akaId
                    );

                    const shiro = getCompetitor(
                      match.shiroId
                    );

                    const winner = match.winnerId
                      ? getCompetitor(match.winnerId)
                      : null;

                    return (
                      <article
                        <article
  className={`competition ${
    match.statut === "Terminé" ? "competition-terminee" : ""
  }`}
  key={match.id}
>                        <div>
                          <p className="surtitle">
                            RENCONTRE {index + 1}
                          </p>

                          <h3>
                            AKA —{" "}
                            {aka
                              ? `${aka.nom} ${aka.prenom}`
                              : "Inconnu"}
                          </h3>

                          <p>contre</p>

                          <h3>
                            SHIRO —{" "}
                            {shiro
                              ? `${shiro.nom} ${shiro.prenom}`
                              : "Inconnu"}
                          </h3>

                          {match.statut ===
                            "Terminé" && (
                            <div className="beta-note">
                              <strong>
                                {match.akaScore} —{" "}
                                {match.shiroScore}
                              </strong>

                              <p>
                                {winner
                                  ? `Vainqueur : ${winner.nom} ${winner.prenom}`
                                  : "Égalité"}
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          className="manage-button"
                          type="button"
                          onClick={() =>
                            selectMatch(match)
                          }
                        >
                          {match.statut === "Terminé"
                            ? "Modifier"
                            : "Arbitrer"}
                        </button>
                      </article>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {selectedMatch && (
  <MatchManager
    key={selectedMatch.id}
    match={{
      aka: getCompetitor(selectedMatch.akaId),
      shiro: getCompetitor(selectedMatch.shiroId),
    }}
    onSave={saveOfficialMatch}
  />
          )}
        </>
      )}
    </div>
  );
}

export default ArbitrationManager;
