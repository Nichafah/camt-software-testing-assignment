--liquibase formatted sql

--changeset election:005-district-poll-closing
ALTER TABLE districts
ADD COLUMN closed_at TIMESTAMPTZ NULL;

--rollback ALTER TABLE districts DROP COLUMN closed_at;