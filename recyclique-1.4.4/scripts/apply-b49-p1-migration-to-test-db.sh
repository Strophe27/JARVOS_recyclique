#!/bin/bash
# Script pour appliquer la migration B49-P1 sur la base de test

set -e

echo "🔧 Application de la migration B49-P1 sur recyclic_test..."

# Appliquer les colonnes directement via psql
docker-compose exec -T postgres psql -U recyclic -d recyclic_test <<EOF
-- Ajouter les colonnes si elles n'existent pas
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cash_registers' AND column_name = 'workflow_options'
    ) THEN
        ALTER TABLE cash_registers ADD COLUMN workflow_options JSONB NOT NULL DEFAULT '{}';
        RAISE NOTICE 'Colonne workflow_options ajoutée';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cash_registers' AND column_name = 'enable_virtual'
    ) THEN
        ALTER TABLE cash_registers ADD COLUMN enable_virtual BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Colonne enable_virtual ajoutée';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cash_registers' AND column_name = 'enable_deferred'
    ) THEN
        ALTER TABLE cash_registers ADD COLUMN enable_deferred BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Colonne enable_deferred ajoutée';
    END IF;
END
\$\$;

-- Mettre à jour alembic_version
UPDATE alembic_version SET version_num = 'b49_p1_workflow' WHERE version_num != 'b49_p1_workflow';

-- Vérifier
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cash_registers' 
AND column_name IN ('workflow_options', 'enable_virtual', 'enable_deferred')
ORDER BY column_name;
EOF

echo "✅ Migration appliquée avec succès"



