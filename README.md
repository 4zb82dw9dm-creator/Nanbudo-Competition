# Nanbudo Competition

## Configuration sécurisée

L'application utilise Supabase Auth et des routes à hash compatibles avec GitHub Pages. Copiez `.env.example` vers `.env`, renseignez l'URL et la clé anonyme du projet Supabase, puis appliquez la migration `supabase/migrations/20260807150000_secure_public_registrations.sql`. Créez les comptes Commission depuis l'administration Supabase Auth : aucune inscription de compte ni aucun mot de passe n'est exposé dans le client.

Les liens clubs suivent le format `#/inscription/:slug`. Les autres routes passent par la connexion Commission. La clé anonyme est publique par conception ; la protection des données repose sur les politiques RLS et les deux fonctions SQL qui ne renvoient que les informations publiques et n'autorisent que l'ajout atomique d'inscriptions à la compétition identifiée par le slug.

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
