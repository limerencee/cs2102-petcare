const sql = {}

sql.query = {
	// Basic queries wiht no parameters
	all_users: 'SELECT * FROM users;',
	all_caretakers: 'SELECT * FROM caretakers;',
	all_admins: 'SELECT * FROM users WHERE type=\'admin\';',
	all_pet_owners: 'SELECT * FROM users WHERE is_pet_owner;',
	all_owners_pets_pairs: 'SELECT * FROM pets;',
	all_available_pet_types: 'SELECT pet_type FROM pet_types;',
	
	// Information queries for normal users
	query_pets: 'SELECT pet_name, pet_type, gender, special_needs FROM pets WHERE owner_uname=$1;',
	query_pets_pettype: 'SELECT pet_name, gender, special_needs FROM pets WHERE owner_uname=$1 and pet_type=$2;',
	query_pets_list_bidding_selection: `SELECT pet_name, gender, special_needs FROM pets p WHERE owner_uname=$1 and pet_type=$2
		AND NOT EXISTS (SELECT * FROM bids WHERE bids.owner_uname=$1 and p.pet_name=bids.pet_name and 
		( 
		($3 <= bids.start_date and $4 >= bids.start_date and $4 <= bids.end_date) 
		or ($3 <= bids.start_date and $4 >= bids.end_date)
		or ($3 >= bids.start_date and $3 <= bids.end_date and $4 <= bids.end_date) 
		or ($3 >= bids.start_date and $3 <= bids.end_date and $4 > bids.end_date)
		) and bids.status = 'success');`,
	query_info: 'SELECT * FROM users WHERE username=$1;',
	
	// Inserts for profiles
	add_admin: 'INSERT INTO users (username, password, email, type, gender) VALUES ($1,$2,$3,\'admin\',$4);',
	add_caretaker: 'INSERT INTO caretakers (username, type) VALUES ($1,$2);',
	add_pet: 'INSERT INTO pets (owner_uname, pet_name, pet_type, gender, special_needs) VALUES ($1,$2,$3,$4);',
	add_user: 'INSERT INTO users (username, password, email, type, gender, card_name, card_no, cvv, card_expiry_date, cash) VALUES ($1,$2,$3,\'normal\',$4,$5,$6,$7,$8,$9);',
	
	// Login
	userpass: 'SELECT * FROM users WHERE username=$1;',
	user_is_caretaker: 'SELECT * FROM caretakers WHERE username=$1 AND approved=TRUE;',
	

	// Biddings 
	fetch_petowner_ongoing_biddings: 'SELECT * FROM bids WHERE owner_uname=$1 AND (status=\'success\' OR status=\'pending\') AND start_date <= $2 AND end_date >= $2;',
	fetch_petowner_past_biddings: 'SELECT * FROM bids WHERE owner_uname=$1 AND (status=\'success\' OR status=\'fail\') AND end_date < $2;',
  
	// Jobs
	fetch_ctaker_offers: 'SELECT * FROM (bids NATURAL JOIN pets) INNER JOIN (SELECT username, email FROM users) AS u ON u.username=bids.owner_uname WHERE ctaker_uname=$1 AND status=\'pending\';',
	accept_ctaker_offer: 'UPDATE bids SET status=\'success\' WHERE owner_uname=$1 AND ctaker_uname=$2 AND pet_name=$3 AND start_date=$4 AND end_date=$5;',
	reject_ctaker_offer: 'UPDATE bids SET status=\'fail\' WHERE owner_uname=$1 AND ctaker_uname=$2 AND pet_name=$3 AND start_date=$4 AND end_date=$5;',
	fetch_current_jobs: 'SELECT * FROM (bids NATURAL JOIN pets) INNER JOIN (SELECT username, email FROM users) AS u ON u.username=bids.owner_uname WHERE status=\'success\' AND ctaker_uname=$1 AND start_date <= $2 AND end_date >= $2;',
	fetch_upcoming_jobs: 'SELECT * FROM (bids NATURAL JOIN pets) INNER JOIN (SELECT username, email FROM users) AS u ON u.username=bids.owner_uname WHERE status=\'success\' AND ctaker_uname=$1 AND start_date > $2;',
	fetch_completed_jobs: 'SELECT * FROM (bids NATURAL JOIN pets) INNER JOIN (SELECT username, email FROM users) AS u ON u.username=bids.owner_uname WHERE status=\'success\' AND ctaker_uname=$1 AND end_date < $2;',
	get_similar_bids: 
	`	SELECT * 
		FROM bids 
		WHERE owner_uname=$1 
		AND pet_name=$2
		AND status=\'success\'
		AND (($3 <= start_date AND $4 >= start_date AND $4 <= end_date) 
		OR ($3 <= start_date AND $4 >= end_date)
		OR ($3 >= start_date AND $3 <= end_date AND $4 <= end_date) 
		OR ($3 >= start_date AND $3 <= end_date AND $4 > end_date));
	`,

	// Biddings
	fetch_petowner_ongoing_biddings: 'SELECT * FROM bids WHERE owner_uname=$1 AND end_date >= $2;',
	fetch_petowner_past_biddings: 'SELECT * FROM bids WHERE owner_uname=$1 AND status=\'success\' AND end_date < $2;',
	fetch_ongoing_biddings: 'SELECT * FROM bids WHERE status=\'pending\';',
	fetch_all_biddings: 'SELECT * FROM bids;',
	deduct_funds: 'UPDATE users SET cash = CASE WHEN (SELECT payment_method FROM bids WHERE owner_uname=$1 AND ctaker_uname=$2 AND pet_name=$3 AND start_date=$4 AND end_date=$5) = \'cash\' THEN cash - (SELECT bid_price FROM bids WHERE owner_uname=$1 AND ctaker_uname=$2 AND pet_name=$3 AND start_date=$4 AND end_date=$5) ELSE cash END WHERE username=$1;',
	add_bidding: 'INSERT INTO bids (owner_uname, ctaker_uname, pet_name, start_date, end_date, status, payment_method, transfer_type, bid_price) VALUES ($1,$2,$3,$4,$5,\'pending\',$6, $7, $8);',
	add_review: 'UPDATE bids SET review=$1, rating=$2 WHERE owner_uname=$3 AND ctaker_uname=$4 AND pet_name=$5 AND start_date=$6 AND end_date=$7;',

	// Get number of pets currently in the caretakers (Returns the current number of pets when the query is executed)
	fetch_current_number_pets: 'SELECT current_pets_number FROM caretakers c WHERE c.username=$1;',

	// Pets
	user_pets: 'SELECT * FROM pets WHERE owner_uname=$1;',
	add_pet: 'INSERT INTO pets (owner_uname, pet_name, pet_type, gender, special_needs) VALUES($1, $2, $3, $4, $5);',
	update_pet: 'UPDATE pets SET pet_type=$3, gender=$4, special_needs=$5 WHERE owner_uname=$1 AND pet_name=$2;',
	delete_pet: 'DELETE FROM pets WHERE pets.owner_uname=$1 AND pets.pet_name=$2;',
	query_user_pet: 'SELECT * FROM pets WHERE owner_uname=$1 AND pet_name=$2;',

	// Pet Types
	all_pet_types: 'SELECT * FROM pet_types;',
	add_pet_type: 'INSERT INTO pet_types (pet_type, daily_base_price) VALUES($1, $2);',
	update_pet_type: 'UPDATE pet_types SET daily_base_price=$2 WHERE pet_type=$1;',
	query_price_pet_type: 'SELECT daily_base_price FROM pet_types WHERE pet_type = $1;',
	
	// DELETE
	delete_user: 'DELETE FROM users WHERE users.username=$1;',
	delete_pet: 'DELETE FROM pets WHERE pets.owner_uname=$1 AND pets.pet_name=$2;',
	cancel_bid: 'DELETE FROM bids WHERE owner_uname=$1 AND ctaker_uname=$2 AND pet_name=$3 AND start_date=$4 AND end_date=$5;',
	fire_caretaker: 'DELETE FROM caretakers WHERE username=$1;',

	// Check Caretaker Basis
	caretaker_basis: 'SELECT type FROM caretakers WHERE username=$1 AND approved=TRUE;',

	// Summary of caretaker
	fetch_caretaker_summary_this_month: 
	`SELECT * 
	FROM (SELECT ctaker_uname, type,
			EXTRACT(YEAR from start_date) AS year,
			EXTRACT(MONTH from start_date) AS month,
			sum(daily_price) AS monthly_earnings,
			COUNT(start_date) AS pet_days,
			(CASE
				WHEN (type = 'full-time') THEN
					CASE WHEN (COUNT(*) > 60) THEN 3000 + 0.8 * sum(daily_price) ELSE 3000 END
				WHEN (type = 'part-time') THEN 0.75 * sum(daily_price)
			END) AS monthly_salary
		FROM (SELECT daily_price, ctaker_uname, type,
				CASE WHEN start_date::date = d THEN start_date ELSE d END AS start_date,
				CASE WHEN end_date::date = d THEN end_date ELSE d + 1 END AS end_date
			FROM (SELECT type, ctaker_uname, start_date, end_date,
					(bid_price/(date(end_date) - date(start_date) + 1)) AS daily_price,
					generate_series(start_date, end_date, interval '1d')::date AS d
				FROM bids b INNER JOIN caretakers c ON b.ctaker_uname = c.username 
				WHERE status = 'success') sub
		) AS daily_works
		GROUP BY year, month, ctaker_uname, type
		ORDER BY year, month) AS caretaker_payroll
	WHERE ctaker_uname=$1 AND month=$2 AND year=$3;
	`,

	// Part-Time Availability
	query_availability_pt: 'SELECT start_date, end_date FROM pt_avail_periods WHERE username=$1 ORDER BY start_date ASC;',
	add_availability_pt: 'INSERT INTO pt_avail_periods (username, start_date, end_date) VALUES ($1,$2,$3);',
	delete_availability_pt: 'DELETE FROM pt_avail_periods WHERE username=$1 AND start_date=$2 AND end_date=$3;',

	// Full-Time Leaves
	add_leaves_ft: 'INSERT INTO ft_leave_periods (username, start_date, end_date) VALUES ($1,$2,$3);',
	query_leaves_ft: 'SELECT start_date, end_date FROM ft_leave_periods WHERE username=$1 ORDER BY start_date ASC;',
	query_past_leaves_ft: 'SELECT start_date, end_date FROM ft_leave_periods WHERE username=$1 AND end_date < $2 ORDER BY start_date ASC;',
	query_upcoming_leaves_ft: 'SELECT start_date, end_date FROM ft_leave_periods WHERE username=$1 AND start_date > $2 ORDER BY start_date ASC;',
	delete_leaves_ft: 'DELETE FROM ft_leave_periods WHERE username=$1 AND start_date=$2 AND end_date=$3;',

	// Caretaker pet types queries
	query_caretaker_pet_types: 'SELECT pet_type FROM can_care_for WHERE can_care_for.username=$1;',
	add_caretaker_pet_type: 'INSERT INTO can_care_for (username, pet_type) VALUES ($1,$2);',
	delete_caretaker_all_pet_types: 'DELETE FROM can_care_for WHERE username=$1;',
	delete_caretaker_specific_pet_types: 'DELETE FROM can_care_for WHERE username=$1 AND pet_type=$2;',
	caretaker_top_pet_type: `
	SELECT bids.ctaker_uname, pets.pet_type
	FROM bids INNER JOIN pets ON bids.pet_name = pets.pet_name
	WHERE bids.ctaker_uname=$1 
	AND bids.status = \'success\'
	GROUP BY bids.ctaker_uname, pets.pet_type
	HAVING NOT EXISTS (SELECT 1 
						FROM bids b INNER JOIN pets p ON b.pet_name = p.pet_name
						WHERE b.ctaker_uname = bids.ctaker_uname 
						AND p.pet_type != pets.pet_type 
						AND b.status = \'success\'
						GROUP BY b.ctaker_uname, p.pet_type 
						HAVING SUM(b.end_date - b.start_date) > SUM(bids.end_date - bids.start_date));`,

	// Fetch Caretakers and PetOwners
	fetch_ctakers: 'SELECT c.username, c.type, c.avg_rating, c.current_pets_number, u.email FROM caretakers c INNER JOIN users u ON c.username = u.username WHERE c.approved=TRUE;',
	fetch_petowners: `SELECT u.username, u.email, (CASE 
														WHEN EXISTS (SELECT 1 FROM caretakers c WHERE u.username = c.username) THEN \'Yes\' 
														ELSE \'No\' 
													END) AS is_caretaker
						FROM users u
						WHERE u.type = \'normal\' 
						AND u.is_pet_owner = TRUE;`,
	get_payroll_for_ctaker: `SELECT ctaker_uname, type,
	EXTRACT(YEAR from start_date) AS year,
	EXTRACT(MONTH from start_date) AS month,
	SUM(daily_price) AS monthly_earnings,
	SUM(pet_day) AS pet_days,
	(CASE
	WHEN (type = 'full-time') THEN
		CASE WHEN (SUM(pet_day) > 60) THEN 3000 + 0.8 * SUM(daily_price) ELSE 3000 END
	WHEN (type = 'part-time') THEN 0.75 * SUM(daily_price)
	END) AS monthly_salary
	FROM (SELECT type, ctaker_uname, daily_price, pet_day,
	CASE WHEN start_date::date = d THEN start_date ELSE d END AS start_date,
	CASE WHEN end_date::date = d THEN end_date ELSE d + 1 END AS end_date
		FROM (SELECT type, ctaker_uname, start_date, end_date,
			(bid_price/(date(end_date) - date(start_date) + 1)) AS daily_price,
			1 AS pet_day,
			generate_series(start_date, end_date, interval '1d')::date AS d
			FROM bids b INNER JOIN caretakers c ON b.ctaker_uname = c.username
			WHERE status = 'success') sub
	UNION
	SELECT type, ctaker_uname, daily_price, pet_day,
	CASE WHEN start_date::date = d THEN start_date ELSE d END AS start_date,
	CASE WHEN end_date::date = d THEN end_date ELSE d + 1 END AS end_date
		FROM (SELECT type, ctaker_uname, MIN(start_date) AS start_date, NOW() AS end_date,
			0 AS daily_price, 0 AS pet_day,
			generate_series((SELECT created_at FROM users WHERE username=ctaker_uname), NOW(), interval '1d')::date AS d
			FROM bids b INNER JOIN caretakers c ON b.ctaker_uname = c.username
			GROUP BY ctaker_uname, type) sub
	) daily_works
	WHERE ctaker_uname=$1
	AND (EXTRACT(YEAR from start_date) < date_part('year', (SELECT current_timestamp)) OR 
		(EXTRACT(YEAR from start_date) = date_part('year', (SELECT current_timestamp))
		AND EXTRACT(MONTH from start_date) <= date_part('month', (SELECT current_timestamp))))
	GROUP BY year, month, ctaker_uname, type
	ORDER BY year DESC, month DESC;`,
	get_reviews_for_ctaker: 'SELECT rating, review, pet_type, start_date, end_date, owner_uname FROM bids NATURAL JOIN pets WHERE ctaker_uname=$1 AND pet_type=$2 AND status=\'success\' AND rating IS NOT NULL;',
	fetch_top_10_ctakers_earnings: `SELECT ctaker_uname, type, SUM(monthly_pet_days) AS pet_days, SUM(monthly_salary) AS earnings
	FROM (SELECT ctaker_uname, type,
		EXTRACT(YEAR from start_date) AS year,
		EXTRACT(MONTH from start_date) AS month,
		SUM(daily_price) AS monthly_earnings,
		SUM(pet_day) AS monthly_pet_days,
		(CASE
		WHEN (type = 'full-time') THEN
			CASE WHEN (SUM(pet_day) > 60) THEN 3000 + 0.8 * SUM(daily_price) ELSE 3000 END
		WHEN (type = 'part-time') THEN 0.75 * SUM(daily_price)
		END) AS monthly_salary
		FROM (SELECT type, ctaker_uname, daily_price, pet_day,
		CASE WHEN start_date::date = d THEN start_date ELSE d END AS start_date,
		CASE WHEN end_date::date = d THEN end_date ELSE d + 1 END AS end_date
			FROM (SELECT type, ctaker_uname, start_date, end_date,
				(bid_price/(date(end_date) - date(start_date) + 1)) AS daily_price,
				1 AS pet_day,
				generate_series(start_date, end_date, interval '1d')::date AS d
				FROM bids b INNER JOIN caretakers c ON b.ctaker_uname = c.username
				WHERE status = 'success') sub
		UNION
		SELECT type, ctaker_uname, daily_price, pet_day,
		CASE WHEN start_date::date = d THEN start_date ELSE d END AS start_date,
		CASE WHEN end_date::date = d THEN end_date ELSE d + 1 END AS end_date
			FROM (SELECT type, ctaker_uname, MIN(start_date) AS start_date, NOW() AS end_date,
				0 AS daily_price, 0 AS pet_day,
				generate_series((SELECT created_at FROM users WHERE username=ctaker_uname), NOW(), interval '1d')::date AS d
				FROM bids b INNER JOIN caretakers c ON b.ctaker_uname = c.username
				GROUP BY ctaker_uname, type) sub
		) daily_works
		WHERE (EXTRACT(YEAR from start_date) < date_part('year', (SELECT current_timestamp)) OR 
			(EXTRACT(YEAR from start_date) = date_part('year', (SELECT current_timestamp))
			AND EXTRACT(MONTH from start_date) <= date_part('month', (SELECT current_timestamp))))
		GROUP BY year, month, ctaker_uname, type) payroll
	GROUP BY ctaker_uname, type
	ORDER BY earnings DESC LIMIT 10;`,

	// fetch users with no role
	fetch_new_inactive_users: `SELECT u.username, u.email, u.created_at 
								FROM users u
								WHERE u.type = \'normal\'
								AND u.is_pet_owner = FALSE
								AND NOT EXISTS (SELECT 1 
												FROM caretakers c
												WHERE c.username = u.username);`,

	//fetch admin
	fetch_admin: 'SELECT username, email FROM users WHERE type=\'admin\';',

	//search Care taker dashboard
	search_all_caretaker: 'SELECT * FROM caretakers where caretakers.approved = TRUE;',
	search_caretaker_pt_ft: `SELECT caretakers.username, 
								$7 AS pet_type, avg_rating, 
								CASE WHEN caretakers.avg_rating = 0 
									THEN (1 * $6) ELSE (avg_rating * $6) END AS daily_price 
							FROM caretakers INNER JOIN pt_avail_periods 
								ON caretakers.username = pt_avail_periods.username 
							WHERE caretakers.approved = TRUE and 
								($6 * avg_rating  >= $4 and $6 * avg_rating <= $5) and 
								type = \'part-time\' and 
								start_date <= $1 and end_date >= $2 and 
								avg_rating >= $3 and 
								EXISTS (SELECT can_care_for.username 
									FROM can_care_for 
									WHERE caretakers.username = can_care_for.username and can_care_for.pet_type = $7)
							UNION
							SELECT username, 
								$7 AS pet_type, avg_rating, 
								CASE WHEN caretakers.avg_rating = 0 
									THEN (1 * $6) ELSE (avg_rating * $6) END AS daily_price 
								FROM caretakers WHERE caretakers.approved = TRUE and 
								($6 * avg_rating  >= $4 and $6 * avg_rating <= $5) and 
								type = \'full-time\' and 
								avg_rating >= $3 and 
								NOT EXISTS (SELECT * 
									FROM ft_leave_periods 
									WHERE (($1 >= start_date AND $2 <= end_date) 
									OR ($1 <= start_date AND ($2 >= start_date AND $2 <= end_date)) 
									OR ($1 <= start_date AND $2 >= end_date) 
									OR (($1 >= start_date AND $1 <= end_date) AND $2 >= end_date)) 
									AND caretakers.username = ft_leave_periods.username) and 
								EXISTS (SELECT can_care_for.username 
									FROM can_care_for 
									WHERE caretakers.username = can_care_for.username and can_care_for.pet_type = $7)
							ORDER BY username ASC;`,


	// Get caretaker avg_rating
	fetch_caretaker_avg_rating: 'SELECT avg_rating FROM caretaker_avg_ratings WHERE username=$1;',

	// Need for organising 
	fetch_pet_number_on_specific_day: 'SELECT COUNT(*) FROM bids b WHERE b.ctaker_uname=$1 AND b.status=\'success\' AND $2 BETWEEN b.start_date AND b.end_date;',

	//Profile
	update_info: 'UPDATE users SET email=$2, gender=$3 WHERE username=$1;',
	update_pass: 'UPDATE users SET password = $2 WHERE username = $1;',
	update_card_info: 'UPDATE users SET card_name = $2, card_no = $3, cvv = $4, card_expiry_date = $5 WHERE username = $1;',
	top_up_cash: 'UPDATE users SET cash=cash+$2 WHERE username=$1;',

	//job application
	fetch_job_application: 
	`SELECT u.username AS username, u.email AS email, c.type AS type, t.pet_services AS pet_services
	FROM users u 
		INNER JOIN 
		(caretakers c NATURAL JOIN (SELECT username, string_agg(pet_type, ', ') AS pet_services 
									FROM can_care_for 
									GROUP BY username) AS t) 
		ON u.username = c.username
	WHERE c.approved=FALSE;`,
	reject_job_application: 'DELETE FROM caretakers WHERE username=$1;',
	approve_job_application: 'UPDATE caretakers SET approved=TRUE WHERE username=$1;',
	is_pending_job_application: 'SELECT * FROM caretakers WHERE username=$1 AND approved=FALSE;',

	daily_bids_table_cleanup: 'CALL daily_job();'

}

module.exports = sql
