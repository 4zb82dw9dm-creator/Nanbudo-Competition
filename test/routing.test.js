import test from "node:test";
import assert from "node:assert/strict";
import { publicRegistrationSlug, publicRegistrationUrl } from "../src/routing.js";

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
