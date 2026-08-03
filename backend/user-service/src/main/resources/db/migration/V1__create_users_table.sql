-- user-service: users table (auth / accounts).
-- Mirrors docs/postgre-schema.md section 3.1.
-- Email uniqueness is case-insensitive, implemented as a unique index on LOWER(email).

CREATE TABLE users (
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    email         VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    enabled       BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT ck_users_role CHECK (role IN ('CUSTOMER', 'ADMIN'))
);

CREATE UNIQUE INDEX ux_users_email_lower ON users (LOWER(email));
