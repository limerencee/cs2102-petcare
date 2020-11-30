-- DROP TRIGGERS WHICH TRIGGER NAMES ARE NOT ACCORDING TO CONVENTION
DROP TRIGGER IF EXISTS check_insert_admins_cannot_own_pets ON users;
DROP TRIGGER IF EXISTS check_admin_update ON users;
DROP TRIGGER IF EXISTS check_caretaker_is_not_admin ON caretakers;

-- DROP TRIGGERS WHICH NAMES WHICH FOR FORMAT FOR NAMING CONVENTIONS
DROP TRIGGER IF EXISTS tr_users_newAdminsNoPets ON users;
DROP TRIGGER IF EXISTS tr_users_adminNoPets ON users;
DROP TRIGGER IF EXISTS tr_caretakers_ensureNotAdmin ON caretakers;
DROP TRIGGER IF EXISTS tr_pets_noAdminOwners ON pets;
DROP TRIGGER IF EXISTS tr_pets_updateOwnerStatusInsert ON pets;
DROP TRIGGER IF EXISTS tr_pets_updateOwnerStatusDelete ON pets;
DROP TRIGGER IF EXISTS tr_cancarefor_checkPetTypeInsert ON can_care_for;
DROP TRIGGER IF EXISTS tr_ptavail_failWhenAlreadyIndicated ON pt_avail_periods;
DROP TRIGGER IF EXISTS tr_ftleaves_failAllBidsWhenCTLeaves ON ft_leave_periods;
DROP TRIGGER IF EXISTS tr_bids_cashMoreThanPrice ON bids;
DROP TRIGGER IF EXISTS tr_ftbids_autoAcceptIfFree ON bids;
DROP TRIGGER IF EXISTS tr_bids_concurrentJobsLimit ON bids;
DROP TRIGGER IF EXISTS tr_bids_updateCTcomputedAttributes ON bids;
DROP TRIGGER IF EXISTS tr_bids_preventCTHistoryWipe ON bids;

-- The drop functions are to remove functions due to name changes
DROP FUNCTION IF EXISTS non_admin_caretaker;
DROP FUNCTION IF EXISTS cannot_own_pets;
DROP FUNCTION IF EXISTS prevent_admins_from_owning_pets;
DROP FUNCTION IF EXISTS auto_accept_bid;
DROP FUNCTION IF EXISTS autofail_bids;
DROP FUNCTION IF EXISTS caretaker_attribute_update;
DROP FUNCTION IF EXISTS concurrent_jobs_limit;
DROP FUNCTION IF EXISTS deny_avail_overlap;
DROP FUNCTION IF EXISTS ensure_enough_cash;
DROP FUNCTION IF EXISTS no_pets_allowed_admins;
DROP FUNCTION IF EXISTS pet_type_is_listed;
DROP FUNCTION IF EXISTS preserve_ct_history;
DROP FUNCTION IF EXISTS update_is_pet_owner;
DROP FUNCTION IF EXISTS update_is_pet_owner_after_delete;
