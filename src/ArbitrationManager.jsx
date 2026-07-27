import { useState } from "react";
import MatchManager from "./MatchManager";

function ArbitrationManager({
  competition,
  onUpdateCompetition,
}) {
  const pools = competition.pools || [];
  const competitors = competition.competitors || [];

  const [selectedPoolId, setSelectedPoolId] =
    useState("");
  const [selectedMatchId, setSelectedMatchId] =
    useState("");
  const [selectedMatchType, setSelectedMatchType] =
    useState("");

  function getCompetitor(id) {
    return competitors.find(
      (competitor) => competitor.id === id
    );
  }

  const selectedPool = pools.find(
    (pool) =>
      String(pool.id) === String(selectedPoolId)
  );

  const poolMatches = selectedPool?.matches || [];
  const finalMatches =
    selectedPool?.finalMatches || [];

  const selectedMatch =
    selectedMatchType === "final"
      ? finalMatches.find(
          (match) =>
            String(match.id) ===
            String(selectedMatchId)
        )
      : poolMatches.find(
          (match) =>
            String(match.id) ===
            String(selectedMatchId)
        );

  function selectMatch(match, type) {
    setSelectedMatchId(match.id);
    setSelectedMatchType(type);
  }

  function calculatePodium(finalMatchesList) {
    const finale = finalMatchesList.find(
      (match) => match.type === "finale"
    );

    const petiteFinale = finalMatchesList.find(
      (match) =>
        match.type === "petite-finale"
    );

    if (
      !finale ||
      !petiteFinale ||
      finale.statut !== "Terminé" ||
      petiteFinale.statut !== "Terminé"
    ) {
      return null;
    }

    if (
      !finale.winnerId ||
      !petiteFinale.winnerId
    ) {
      return null;
    }

    const secondId =
      finale.winnerId === finale.akaId
        ? finale.shiroId
        : finale.akaId;

    const fourthId =
      petiteFinale.winnerId ===
      petiteFinale.akaId
        ? petiteFinale.shiroId
        : petiteFinale.akaId;

    return {
      firstId: finale.winnerId,
      secondId,
      thirdId: petiteFinale.winnerId,
      fourthId,
    };
  }

  function saveOfficialMatch(result) {
    if (!selectedPool || !selectedMatch) {
      return;
    }

    const winnerId =
      result.vainqueur === "aka"
        ? selectedMatch.akaId
        : result.vainqueur === "shiro"
          ? selectedMatch.shiroId
          : null;

    const savedMatch = {
      ...selectedMatch,

      assauts: result.assauts,

      akaScore: result.scoreAka,
      shiroScore: result.scoreShiro,

      scoreBrutAka: result.scoreBrutAka,
      scoreBrutShiro: result.scoreBrutShiro,

      penalitesAka: result.penalitesAka,
      penalitesShiro: result.penalitesShiro,

      pointsNegatifsAka:
        result.pointsNegatifsAka,
      pointsNegatifsShiro:
        result.pointsNegatifsShiro,

      akaDisqualifie:
        result.akaDisqualifie,
      shiroDisqualifie:
        result.shiroDisqualifie,

      winnerId,
      statut: "Terminé",
    };

    const updatedPools = pools.map((pool) => {
      if (pool.id !== selectedPool.id) {
        return pool;
      }

      if (selectedMatchType === "final") {
        const updatedFinalMatches = (
          pool.finalMatches || []
        ).map((match) =>
          match.id === selectedMatch.id
            ? savedMatch
            : match
        );

        const podium =
          calculatePodium(updatedFinalMatches);

        return {
          ...pool,
          finalMatches: updatedFinalMatches,
          podium,
          statut: podium
            ? "Terminée"
            : "Phase finale",
        };
      }

      return {
        ...pool,
        matches: pool.matches.map((match) =>
          match.id === selectedMatch.id
            ? savedMatch
            : match
        ),
      };
    });

    onUpdateCompetition({
      ...competition,
      pools: updatedPools,
    });

    setSelectedMatchId("");
    setSelectedMatchType("");
  }

  function renderMatch(
    match,
    label,
    matchType
  ) {
    const aka = getCompetitor(match.akaId);
    const shiro = getCompetitor(match.shiroId);

    const winner = match.winnerId
      ? getCompetitor(match.winnerId)
      : null;

    return (
      <article
        className={`competition ${
          match.statut === "Terminé"
            ? "competition-terminee"
            : ""
        }`}
        key={match.id}
      >
        <div>
          <p className="surtitle">
            {label}
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

          {match.statut === "Terminé" && (
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
            selectMatch(match, matchType)
          }
        >
          {match.statut === "Terminé"
            ? "Modifier"
            : "Arbitrer"}
        </button>
      </article>
    );
  }

  return (
    <div className="arbitration-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">
            AIRE DE COMBAT
          </p>

          <h2>Arbitrage</h2>

          <p>
            Sélection d'une poule et saisie des
            résultats des rencontres.
          </p>
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="empty-state">
          <h3>
            Aucune poule disponible
          </h3>

          <p>
            Génère d'abord les poules avant de
            commencer l'arbitrage.
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
                  setSelectedPoolId(
                    event.target.value
                  );
                  setSelectedMatchId("");
                  setSelectedMatchType("");
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
            <>
              <section className="category-section">
                <div className="category-section-header">
                  <div>
                    <p className="surtitle">
                      RENCONTRES DE POULE
                    </p>

                    <h3>
                      {selectedPool.nom}
                    </h3>
                  </div>

                  <span className="status">
                    {
                      poolMatches.filter(
                        (match) =>
                          match.statut ===
                          "Terminé"
                      ).length
                    }
                    /{poolMatches.length}{" "}
                    terminées
                  </span>
                </div>

                <div className="competition-list">
                  {poolMatches.map(
                    (match, index) =>
                      renderMatch(
                        match,
                        `RENCONTRE ${index + 1}`,
                        "pool"
                      )
                  )}
                </div>
              </section>

              {finalMatches.length > 0 && (
                <section className="category-section">
                  <div className="category-section-header">
                    <div>
                      <p className="surtitle">
                        PHASE FINALE
                      </p>

                      <h3>
                        Finale et petite finale
                      </h3>
                    </div>

                    <span className="status">
                      {
                        finalMatches.filter(
                          (match) =>
                            match.statut ===
                            "Terminé"
                        ).length
                      }
                      /{finalMatches.length}{" "}
                      terminées
                    </span>
                  </div>

                  <div className="competition-list">
                    {finalMatches.map((match) =>
                      renderMatch(
                        match,
                        match.label ||
                          "PHASE FINALE",
                        "final"
                      )
                    )}
                  </div>
                </section>
              )}

              {selectedPool.podium && (
                <section className="category-section">
                  <div className="pool-ranking">
                    <h3>
                      Podium final
                    </h3>

                    <p>
                      🥇{" "}
                      {getCompetitor(
                        selectedPool.podium
                          .firstId
                      )?.nom || "—"}{" "}
                      {getCompetitor(
                        selectedPool.podium
                          .firstId
                      )?.prenom || ""}
                    </p>

                    <p>
                      🥈{" "}
                      {getCompetitor(
                        selectedPool.podium
                          .secondId
                      )?.nom || "—"}{" "}
                      {getCompetitor(
                        selectedPool.podium
                          .secondId
                      )?.prenom || ""}
                    </p>

                    <p>
                      🥉{" "}
                      {getCompetitor(
                        selectedPool.podium
                          .thirdId
                      )?.nom || "—"}{" "}
                      {getCompetitor(
                        selectedPool.podium
                          .thirdId
                      )?.prenom || ""}
                    </p>
                  </div>
                </section>
              )}
            </>
          )}

          {selectedMatch && (
            <MatchManager
              key={selectedMatch.id}
              match={{
                aka: getCompetitor(
                  selectedMatch.akaId
                ),
                shiro: getCompetitor(
                  selectedMatch.shiroId
                ),
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
