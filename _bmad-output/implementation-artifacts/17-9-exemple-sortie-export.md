# Story 17.9 — Exemple de sortie export valide

## Rapport by-session (CSV)

Format : 3 sections (SESSION ; ITEMS ; PAYMENTS) séparées par une ligne vide.

```csv
session_id,opened_at,closed_at,site_name,register_name,operator_name,initial_amount,closing_amount,actual_amount,variance,total_sales,total_items
550e8400-e29b-41d4-a716-446655440000,2026-03-01 10:00:00,2026-03-01 18:00:00,Site Principal,Caisse 1,op_rapport,0,1000,1000,0,500,1

sale_id,sale_date,category_name,quantity,unit_price,total_price,weight
660e8400-e29b-41d4-a716-446655440001,2026-03-01 14:30:00,Test Cat,1,500,500,

sale_id,payment_method,amount
660e8400-e29b-41d4-a716-446655440001,especes,500
```

## Export bulk (ZIP)

Le ZIP contient un fichier CSV par session (même format que by-session) :
- `rapport-session-{session_id}.csv`
- Cas 0 sessions : ZIP vide.

Nom du fichier ZIP : `export-bulk-{YYYY-MM-DD}.zip` ou `export-bulk-{date_from}-{date_to}.zip` si filtres dates.
