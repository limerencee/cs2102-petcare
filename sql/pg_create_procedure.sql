CREATE OR REPLACE PROCEDURE daily_job() 
LANGUAGE plpgsql AS $$
BEGIN
    -- Updates attributes first
    UPDATE caretakers
    SET avg_rating = (SELECT COALESCE((SUM(rating)::NUMERIC) / (COUNT(*)::NUMERIC), 0)
                      FROM bids
                      WHERE bids.ctaker_uname = caretakers.username
                        AND status = 'success'
                        AND rating IS NOT NULL),
        current_pets_number = (SELECT COALESCE(COUNT(*), 0)
		                       FROM bids b
		                       WHERE b.ctaker_uname = caretakers.username
                                 AND status = 'success'
                                 AND NOW()::DATE BETWEEN start_date AND end_date);

    -- Table cleanup
    DELETE FROM bids
    WHERE status = 'fail' AND NOW()::DATE > bids.end_date;
END;
$$;
