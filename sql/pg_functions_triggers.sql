-- Trigger to prevent an insert of admin user with is_pet_owner set to true;
CREATE OR REPLACE FUNCTION cannot_own_pets() RETURNS trigger AS $$
    BEGIN
	    IF NEW.type='admin' AND NEW.is_pet_owner=true THEN
		    RAISE EXCEPTION 'Invalid Insert on users: New administrator cannot be labelled as pet owners';
		END IF;
		RETURN NEW;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_newAdminsNoPets
    BEFORE INSERT ON users
	FOR EACH ROW EXECUTE PROCEDURE cannot_own_pets();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Trigger to prevent changing admin user's is_pet_owner from being set to true
CREATE OR REPLACE FUNCTION prevent_admins_from_owning_pets() RETURNS trigger AS $$
    BEGIN
	    IF OLD.type='admin' AND NEW.is_pet_owner=true THEN
		    RAISE EXCEPTION 'Invalid Update on users: Existing administrators cannot be labelled as pet owners';
		END IF;
		RETURN NEW;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_adminNoPets
    BEFORE UPDATE OF is_pet_owner ON users
	FOR EACH ROW EXECUTE PROCEDURE prevent_admins_from_owning_pets();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Prevent admins from becoming caretakers
CREATE OR REPLACE FUNCTION non_admin_caretaker() RETURNS trigger AS $$
    DECLARE x INTEGER;
    BEGIN
	    SELECT 1 INTO x 
		FROM users 
		WHERE users.username=NEW.username 
		AND users.type='admin';
		IF x=1 THEN
		    RAISE EXCEPTION 'Invalid Insert on caretakers: Administrators cannot be caretakers';
		END IF;
		RETURN NEW;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_caretakers_ensureNotAdmin
    BEFORE INSERT ON caretakers
	FOR EACH ROW EXECUTE PROCEDURE non_admin_caretaker();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Updates the pet owner field is_pet_owner when an owned pet is inserted.
CREATE OR REPLACE FUNCTION update_is_pet_owner() RETURNS trigger AS $$
    BEGIN
	    UPDATE users
		SET is_pet_owner=true
		WHERE users.username=NEW.owner_uname;
		RETURN NEW;
	END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_pets_updateOwnerStatusInsert
    AFTER INSERT ON pets
	FOR EACH ROW EXECUTE PROCEDURE update_is_pet_owner();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Update is_pet_owner status of users when no more pets are owned in the database.
CREATE OR REPLACE FUNCTION update_is_pet_owner_after_delete() RETURNS trigger AS $$
 	BEGIN
 		IF NOT EXISTS (SELECT 1 FROM pets WHERE pets.owner_uname=OLD.owner_uname) THEN
		    UPDATE users
 			SET is_pet_owner=false
 			WHERE username=OLD.owner_uname;
 		END IF;
 		RETURN OLD;
 	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_pets_updateOwnerStatusDelete
    AFTER DELETE ON pets
	FOR EACH ROW EXECUTE PROCEDURE update_is_pet_owner_after_delete();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Prevent admins from owning pets
CREATE OR REPLACE FUNCTION no_pets_allowed_admins() RETURNS trigger AS $$
    DECLARE is_admin INTEGER;
    BEGIN
	    SELECT 1 INTO is_admin FROM users WHERE users.username = NEW.owner_uname AND users.type = 'admin';
		IF is_admin = 1 THEN
		    RAISE EXCEPTION 'Invalid Insert on pets: Referenced pet owner cannot be an administrator.';
		END IF;
		RETURN NEW;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_pets_noAdminOwners
    BEFORE INSERT ON pets
	FOR EACH ROW EXECUTE PROCEDURE no_pets_allowed_admins();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Trigger to prevent caretakers from listing services for a pet type not specfied for PetCare.
CREATE OR REPLACE FUNCTION pet_type_is_listed() RETURNS trigger AS $$
    DECLARE is_listed INTEGER;
    BEGIN
	    SELECT 1 INTO is_listed
		FROM pet_types
		WHERE pet_type = NEW.pet_type;
		IF is_listed <> 1 THEN
		    RAISE EXCEPTION 'Invalid Insert on can_care_for: Pet type to be inserted is not present in pet_types.';
		END IF;
		RETURN NEW;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_cancarefor_checkPetTypeInsert
    BEFORE INSERT ON can_care_for
	FOR EACH ROW EXECUTE PROCEDURE pet_type_is_listed();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Trigger to set all bids to 'fail' when the caretaker takesa leave
CREATE OR REPLACE FUNCTION autoFail_bids() RETURNS trigger AS $$
    BEGIN
	    UPDATE bids
		SET status='fail'
		WHERE ctaker_uname = NEW.username
		  AND status = 'pending'
		  AND ((NEW.start_date BETWEEN start_date AND end_date OR NEW.end_date BETWEEN start_date AND end_date)
		  OR (start_date BETWEEN NEW.start_date AND NEW.end_date OR end_date BETWEEN NEW.start_date AND NEW.end_date));
		RETURN NEW;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ftleaves_failAllBidsWhenCTLeaves
    AFTER INSERT ON ft_leave_periods
	FOR EACH ROW EXECUTE PROCEDURE autoFail_bids();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Trigger to ensure the bidder/pet owner has enough cash to pay for the service if he wants to pay by cash.
CREATE OR REPLACE FUNCTION ensure_enough_cash() RETURNS trigger AS $$
    DECLARE current_cash NUMERIC;
    BEGIN
	    SELECT cash INTO current_cash
		FROM users
		WHERE users.username = NEW.owner_uname;
		IF NEW.payment_method = 'cash' AND current_cash < NEW.bid_price THEN
		    RAISE EXCEPTION 'Invalid Insert on bids: Pet owner does not have enough cash to pay for the bid price';
		END IF;
		RETURN NEW;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_bids_cashMoreThanPrice
    BEFORE INSERT ON bids
	FOR EACH ROW EXECUTE PROCEDURE ensure_enough_cash();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Trigger to prevent caretakers from taking on more jobs than allowed. Author: @idk
CREATE OR REPLACE FUNCTION concurrent_jobs_limit() RETURNS trigger AS $$
	DECLARE num_jobs INTEGER;
	DECLARE ctaker_type caretaker_type;
	DECLARE ctaker_avg_rating NUMERIC;
    BEGIN
	    IF NEW.status = 'success' THEN
			SELECT count(*) INTO num_jobs FROM bids WHERE NEW.ctaker_uname = ctaker_uname
			AND status = 'success'
			AND ((NEW.start_date BETWEEN start_date AND end_date)
			OR (NEW.end_date BETWEEN start_date AND end_date)
			OR (NEW.start_date <= start_date AND NEW.end_date >= end_date));
			SELECT type INTO ctaker_type FROM caretakers WHERE NEW.ctaker_uname = username AND approved=true;
			IF ctaker_type = 'full-time' AND num_jobs >= 5 THEN
		    	RAISE EXCEPTION 'Invalid Update on bids: Full-time caretakers cannot exceed 5 jobs';
			END IF;
			IF ctaker_type = 'part-time' THEN
				SELECT avg_rating INTO ctaker_avg_rating FROM caretakers WHERE NEW.ctaker_uname = username;
				IF ctaker_avg_rating >= 4 AND num_jobs >= 5 THEN
					RAISE EXCEPTION 'Invalid Update on bids: Part-time caretakers with rating of 4/5 and above cannot exceed 5 jobs';
				END IF;
				IF ctaker_avg_rating < 4 AND num_jobs >= 2 THEN
					RAISE EXCEPTION 'Invalid Update on bids: Part-time caretakers with rating below 4/5 cannot exceed 2 jobs';
				END IF;
			END IF;
		END IF;
		RETURN NEW;
	END;
$$ LANGUAGE plpgsql;
          
CREATE TRIGGER tr_bids_concurrentJobsLimit
    BEFORE UPDATE OF status ON bids
	FOR EACH ROW EXECUTE PROCEDURE concurrent_jobs_limit();
/* ----------------------------------------------------------------------------------------------------------------------*/


-- Trigger to deny PT indicating availability when the dates overlap with existing availability period. Author: @limerencee
CREATE OR REPLACE FUNCTION deny_avail_overlap() RETURNS trigger AS $$
    BEGIN
	    IF EXISTS (
            SELECT 1 FROM pt_avail_periods WHERE username = NEW.username
            AND ((NEW.start_date BETWEEN start_date AND end_date
				OR NEW.end_date BETWEEN start_date AND end_date) 
			OR (NEW.start_date <= start_date AND NEW.end_date >= end_date))
        )
        THEN
            RAISE EXCEPTION 'Invalid Insert on pt_avail_periods: Overlapping period with existing available periods';
        END IF;
	RETURN NEW;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ptavail_failWhenAlreadyIndicated
    BEFORE INSERT ON pt_avail_periods
	FOR EACH ROW EXECUTE PROCEDURE deny_avail_overlap();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Trigger to auto accept bids. Author: @limerencee & @lightz96
CREATE OR REPLACE FUNCTION auto_accept_bid() RETURNS trigger AS $$
    BEGIN
    IF EXISTS (
      SELECT 1
      FROM caretakers c
      WHERE c.username = NEW.ctaker_uname
      AND c.type = 'full-time'
      AND NOT EXISTS ( --check if caretaker will be on leave during bid's date range
        SELECT 1
        FROM ft_leave_periods f
        WHERE c.username = f.username
        AND ((NEW.start_date BETWEEN start_date AND end_date)
            OR (NEW.end_date BETWEEN start_date AND end_date)
            OR (NEW.start_date <= start_date AND NEW.end_date >= end_date))
      )
      AND (SELECT COUNT(*)
        FROM bids b
        WHERE c.username = b.ctaker_uname
        AND ((NEW.start_date BETWEEN start_date AND end_date)
            OR (NEW.end_date BETWEEN start_date AND end_date)
            OR (NEW.start_date <= start_date AND NEW.end_date >= end_date))
        GROUP BY b.ctaker_uname) <= 5

    )
        THEN
            UPDATE bids SET status = 'success' WHERE
                owner_uname = NEW.owner_uname
                AND ctaker_uname = NEW.ctaker_uname
                AND pet_name = NEW.pet_name
                AND start_date = NEW.start_date
                AND end_date = NEW.end_date
                AND status = 'pending';
			IF NEW.payment_method = 'cash' THEN
				UPDATE users SET cash = cash - NEW.bid_price
					WHERE username = NEW.owner_uname;
			END IF;
        END IF;
        RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ftbids_autoAcceptIfFree
    AFTER INSERT ON bids
    FOR EACH ROW EXECUTE PROCEDURE auto_accept_bid();

/* ----------------------------------------------------------------------------------------------------------------------*/

-- Trigger to update avg ratings and current number of pets a caretaker has.
-- Important: If there are no UPDATES on bids, then there will be no updating of the attributes.
CREATE OR REPLACE FUNCTION caretaker_attribute_update() RETURNS trigger AS $$
    DECLARE new_ratings NUMERIC;
	DECLARE updated_number INTEGER;
    BEGIN
	    SELECT COALESCE((SUM(rating)::NUMERIC) / (COUNT(*)::NUMERIC), 0) INTO new_ratings 
		FROM bids b
		WHERE b.ctaker_uname = NEW.ctaker_uname AND status = 'success' AND rating IS NOT NULL;
		SELECT COUNT(*) INTO updated_number
		FROM bids b
		WHERE b.ctaker_uname = NEW.ctaker_uname AND status = 'success' AND NOW()::DATE BETWEEN start_date AND end_date;
		UPDATE caretakers
		   SET avg_rating = new_ratings,
		       current_pets_number = updated_number
		 WHERE caretakers.username = NEW.ctaker_uname;
		RETURN NULL;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_bids_updateCTcomputedAttributes
    AFTER UPDATE ON bids
	FOR EACH ROW EXECUTE PROCEDURE caretaker_attribute_update();
/* ----------------------------------------------------------------------------------------------------------------------*/

-- Trigger to ensure no deletion of b bids records where status is a success, unless delete is from a cascading delete
-- Successful bids are neeeded to ensure the history for a caretaker is intact
CREATE OR REPLACE FUNCTION preserve_CT_history() RETURNS trigger AS $$
    BEGIN
	-- Delete comes from caretakers.
	    IF OLD.status = 'success' AND EXISTS (SELECT 1 FROM caretakers c WHERE c.username=OLD.ctaker_uname) THEN
		    RAISE EXCEPTION 'Invalid Delete on bids: caretaker service history should be preserved';
		ELSE
		    RETURN OLD;
		END IF;
	END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_bids_preventCTHistoryWipe
    BEFORE DELETE ON bids
	FOR EACH ROW EXECUTE PROCEDURE preserve_CT_history();
/* ----------------------------------------------------------------------------------------------------------------------*/
