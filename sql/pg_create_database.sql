CREATE DATABASE petcare
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_Singapore.1252'
    LC_CTYPE = 'English_Singapore.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE petcare
    IS 'Database used for PetCare (CS2102)';
