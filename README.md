# Nanbudo Competition

Application exclusivement dédiée à la gestion des compétitions de Nanbudo.

## Référence règlementaire CINDA 2025

Le document officiel « Règlement International Compétition 2025 » de la Worldwide Nanbudo Federation (CINDA) est la référence métier de l'application.

L'application ne doit pas dupliquer des règles directement dans les écrans : les règles évolutives sont centralisées dans le moteur indépendant situé dans `src/rules/`.

Le moteur distingue les disciplines prévues par le règlement :

- Kata individuel ;
- Kata par équipe ;
- Randori ;
- Ju Randori ;
- Ju Randori par équipe ;
- Dantai Randori, réservé aux évolutions futures.

Les chapitres du PDF qui ne sont pas encore structurés dans la configuration sont volontairement marqués `to_be_structured_from_pdf`. Aucune ambiguïté ne doit être résolue par interprétation personnelle.

## Périmètre fonctionnel

L'application suit le cycle complet d'une compétition :

- création d'une compétition ;
- réception des inscriptions dans la compétition choisie ;
- création automatique des catégories selon l'âge, le sexe et le grade ;
- fusion ou séparation manuelle des catégories par l'organisateur ;
- génération automatique, équilibrée et aléatoire des poules ;
- déplacement manuel d'un compétiteur entre poules d'une même catégorie ;
- génération du tableau de compétition avec matchs, ordre de passage, tatamis et horaires optionnels ;
- ouverture directe de la feuille d'arbitrage officielle Kata ou Combat au clic sur un match ;
- validation du vainqueur, recalcul du classement, attribution des médailles et consultation des résultats.

## Hors périmètre

L'application ne gère pas les clubs, associations, licenciés, cotisations, entraînements, finances ou documents administratifs sans lien direct avec une compétition.
