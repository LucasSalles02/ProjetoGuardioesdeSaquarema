CREATE INDEX users_registration_login ON users(registration_number) WHERE role='USER';
-- Existing collisions remain visible for correction instead of blocking startup.
-- New collisions are rejected even across different schools or inactive accounts.
CREATE FUNCTION enforce_registration_login() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='UPDATE' THEN
        IF NEW.role=OLD.role AND NEW.registration_number IS NOT DISTINCT FROM OLD.registration_number THEN
            RETURN NEW;
        END IF;
    END IF;
    IF NEW.role='USER' AND NEW.registration_number IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(18022031);
        IF EXISTS(SELECT 1 FROM users WHERE role='USER' AND registration_number=NEW.registration_number AND id<>NEW.id) THEN
            RAISE unique_violation USING MESSAGE='Matricula ja cadastrada na plataforma.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER users_registration_login_unique BEFORE INSERT OR UPDATE OF role,registration_number
ON users FOR EACH ROW EXECUTE FUNCTION enforce_registration_login();
