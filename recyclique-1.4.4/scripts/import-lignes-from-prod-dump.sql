-- Script pour importer les lignes de dépôt depuis le dump de production
-- Extrait de recyclic_PROD_db_export_20251127_093108.sql

-- D'abord, vérifier que les tickets existent
-- Les lignes seront importées seulement si les tickets correspondants existent

-- Copier les données de ligne_depot depuis le dump
COPY public.ligne_depot (id, ticket_id, poids_kg, notes, destination, category_id) FROM stdin;








