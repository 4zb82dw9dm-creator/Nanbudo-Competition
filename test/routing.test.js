import test from "node:test";
import assert from "node:assert/strict";
import { competitionPublicSlug, findCompetitionByPublicSlug, publicRegistrationSlug, publicRegistrationUrl } from "../src/routing.js";

test("le lien public cible la route isolée de la compétition", () => {
  assert.equal(
    publicRegistrationUrl("https://example.test", "/Nanbudo-Competition/", "coupe-france-abc123"),
    "https://example.test/Nanbudo-Competition/#/inscription/coupe-france-abc123",
  );
});

test("seule une route publique complète fournit le slug de compétition", () => {
  assert.equal(publicRegistrationSlug("/inscription/coupe-france-abc123"), "coupe-france-abc123");
  assert.equal(publicRegistrationSlug("/"), null);
  assert.equal(publicRegistrationSlug("/inscription/coupe-france-abc123/resultats"), null);
});

test("une compétition est retrouvée par son slug enregistré", () => {
  const competition = { id: "competition-1", nom: "Coupe de France", slug: "lien-public-existant" };
  assert.equal(findCompetitionByPublicSlug([competition], "lien-public-existant"), competition);
});

test("le slug des anciennes compétitions est reconstruit comme lors de la création du lien", () => {
  const competition = { id: "12345678-suite", nom: "Coupe de France" };
  assert.equal(competitionPublicSlug(competition), "coupe-de-france-12345678");
  assert.equal(findCompetitionByPublicSlug([competition], "coupe-de-france-12345678"), competition);
});
