--liquibase formatted sql

-- Start from the schema you already have:
--   pg_dump --schema-only --no-owner --no-privileges <your dev db> > schema.sql
-- then paste it here as the first changeset (split into several if it is long).

--changeset you:001-initial-schema
CREATE TABLE example (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);
--rollback DROP TABLE example;
