DROP TABLE IF EXISTS can_care_for;
DROP TABLE IF EXISTS pt_avail_periods;
DROP TABLE IF EXISTS ft_leave_periods;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS caretakers;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS pet_types;

DROP TYPE IF EXISTS user_type;
DROP TYPE IF EXISTS bid_status;
DROP TYPE IF EXISTS gender_type;
DROP TYPE IF EXISTS caretaker_type;
DROP TYPE IF EXISTS transfer_type;
DROP TYPE IF EXISTS payment_type;

CREATE TYPE transfer_type AS ENUM (
    -- delivery by pet owner to caretaker
    'delivery',
    -- caretaker pickup pet from owner
    'pickup',
    -- meetup at PCS building
    'meetup'
);

CREATE TYPE payment_type AS ENUM (
    'cash',
    'card'
);

CREATE TYPE user_type AS ENUM (
    'normal',
    'admin'
);

CREATE TYPE caretaker_type AS ENUM (
    'full-time',
    'part-time'
);

CREATE TYPE gender_type AS ENUM (
    'male',
    'female'
);

CREATE TYPE bid_status AS ENUM (
    'success',
    'fail',
    'pending'
);

-- a table of pet types and their daily base prices
CREATE TABLE pet_types (
    pet_type VARCHAR(255) PRIMARY KEY,
    -- NUMERIC limit should be revised, this 10, 3 puts an upper limit is just a reasonable estimate.
    daily_base_price NUMERIC NOT NULL,
    CONSTRAINT negative_price_check CHECK (daily_base_price >= 0)
);

-- users table, which references pets for pet ownership
CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    type user_type NOT NULL DEFAULT 'normal',
    gender gender_type NOT NULL,
    card_name VARCHAR(255),
    card_no VARCHAR(16) UNIQUE,
    cvv VARCHAR(3),
    card_expiry_date VARCHAR(5),
    cash NUMERIC NOT NULL DEFAULT 0,
    is_pet_owner BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp,
);


CREATE TABLE caretakers (
    username VARCHAR(255) PRIMARY KEY REFERENCES users (username) ON DELETE CASCADE,
    type caretaker_type NOT NULL,
    avg_rating NUMERIC DEFAULT 0,
    current_pets_number INTEGER NOT NULL DEFAULT 0,
	approved BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT rating_out_of_bounds_check CHECK (avg_rating BETWEEN 0 AND 5),
    CONSTRAINT hard_limit_on_pet_number_check CHECK (current_pets_number <= 5)
);

-- full time leave periods
CREATE TABLE ft_leave_periods (
    username VARCHAR(255) NOT NULL REFERENCES caretakers (username) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    PRIMARY KEY (username, start_date, end_date)
);

-- part time leave periods
CREATE TABLE pt_avail_periods (
    username VARCHAR(255) NOT NULL REFERENCES caretakers (username) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    PRIMARY KEY (username, start_date, end_date)
);

/*
pets references the pet_types table for the pet type. 
combination of username and petname is used to uniquely identify the entries in this 
table given that any other attributes in the table cannot
guarantee a unique entry. 
*/
CREATE TABLE pets (
    owner_uname VARCHAR(255) NOT NULL REFERENCES users (username) ON DELETE CASCADE,
    -- pet name can never be null if you are inserting into this table, doesn't make sense.
    pet_name VARCHAR(255) NOT NULL,
    pet_type VARCHAR(255) NOT NULL REFERENCES pet_types (pet_type),
    gender gender_type,
    special_needs TEXT,
    PRIMARY KEY (owner_uname, pet_name)
);

-- can_care_for table to know which pet types a caretaker can care for
CREATE TABLE can_care_for (
    username VARCHAR(255) REFERENCES caretakers (username) ON DELETE CASCADE,
    pet_type VARCHAR(255) REFERENCES pet_types (pet_type) ON DELETE CASCADE,
    PRIMARY KEY (username, pet_type)
);

CREATE TABLE bids (
    owner_uname VARCHAR(255),
    ctaker_uname VARCHAR(255) NOT NULL REFERENCES caretakers (username) ON DELETE CASCADE, -- TODO: Might need to justify why only this has CASCADE
    pet_name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status bid_status NOT NULL DEFAULT 'pending',
    review TEXT,
    rating INTEGER,
	payment_method payment_type NOT NULL,
    transfer_type transfer_type NOT NULL,
    bid_price NUMERIC NOT NULL,
    PRIMARY KEY (owner_uname, ctaker_uname, pet_name, start_date, end_date),
    FOREIGN KEY (owner_uname, pet_name) REFERENCES pets (owner_uname, pet_name) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT rating_out_of_bounds_check CHECK (rating BETWEEN 0 AND 5),
    CHECK (owner_uname != ctaker_uname)
);
