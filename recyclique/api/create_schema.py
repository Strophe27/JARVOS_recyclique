#!/usr/bin/env python3
"""Script to create database schema directly"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy import create_engine, text
from recyclic_api.core.config import settings

def main():
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Create enums
        print("Creating enums...")
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE userrole AS ENUM ('super-admin', 'admin', 'manager', 'cashier', 'user');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE userstatus AS ENUM ('pending', 'approved', 'rejected');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        
        # Sites must exist before users.site_id FK (alignement DATA-03 / migration d4e5f6a7b8c1).
        print("Creating sites table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sites (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                address VARCHAR,
                city VARCHAR,
                postal_code VARCHAR,
                country VARCHAR,
                configuration JSONB,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))

        # Create users table (aligné modèles M11E : colonne legacy optionnelle, non exposée API)
        print("Creating users table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                legacy_external_contact_id VARCHAR,
                username VARCHAR,
                first_name VARCHAR,
                last_name VARCHAR,
                role userrole NOT NULL DEFAULT 'user',
                status userstatus NOT NULL DEFAULT 'pending',
                is_active BOOLEAN NOT NULL DEFAULT true,
                site_id UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT fk_users_site_id_sites FOREIGN KEY (site_id) REFERENCES sites(id)
            );
        """))

        # Bases créées par d'anciennes exécutions sans FK : nettoyage puis contrainte (idem upgrade Alembic).
        orphan_result = conn.execute(text("""
            WITH cleaned AS (
                UPDATE users
                SET site_id = NULL
                WHERE site_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM sites WHERE sites.id = users.site_id)
                RETURNING 1
            )
            SELECT count(*) FROM cleaned
        """))
        n_orphan = orphan_result.scalar() or 0
        if n_orphan:
            print(
                f"DATA-03: {n_orphan} ligne(s) users.site_id orphelin -> NULL "
                "(alignement migration d4e5f6a7b8c1)"
            )
        conn.execute(text("""
            DO $$ BEGIN
                ALTER TABLE users
                ADD CONSTRAINT fk_users_site_id_sites
                FOREIGN KEY (site_id) REFERENCES sites(id);
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_users_legacy_external_contact_id
            ON users(legacy_external_contact_id);
        """))
        
        conn.commit()
        print("Schema created successfully!")

if __name__ == "__main__":
    main()
