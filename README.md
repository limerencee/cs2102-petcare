# PetCare

## PetCare Report
[PetCare Report](#)

## PetCare Web Application
[PetCare Web App](#) <br/>
**Admin Credentials**: `admin:not@dmin` <br/>
**User Credentials**: [List of User Credentials](./sql/records/records_info/user_records.csv)

## PetCare Promotional Video
[![PetCare Promotional Video](http://img.youtube.com/vi/5wgy_Dg5aLc/0.jpg)](https://www.youtube.com/watch?v=5wgy_Dg5aLc "AY2021 Semester 1 - CS2102 Project Video (Team 42)")

----

# Installation

1. Ensure that you have [NodeJS](https://nodejs.org/en/download/) and [PostgreSQL](https://www.postgresql.org/download/) installed.

2. In this project directory, run:
    
    ```bash
    $ npm install
    ```

3. Create the `petcare` database by running the query (either using pgAdmin or CLI) inside `/sql/pg_create_database.sql`:

    ```sql
    CREATE DATABASE petcare
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

    COMMENT ON DATABASE petcare
        IS 'Database used for PetCare (CS2102)';
    ```

4. Setup your own `/.env` file, by placing it in this project's root directory. **For security purposes, we are not commiting this file.**
  
    i. Ensure that the variables `SECRET` and `DATABASE_URL` are set:
    ```bash
    # .env
    SECRET=something_secure
    DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/petcare
    ```

    ii. You can randomise the `SECRET` by running:
    ```bash
    echo SECRET=$(echo -n $RANDOM | sha256sum | awk '{print $1}')
    ```

5. Start the server:
    
    ```bash
    $ npm start
    ```

6. Visit `http://localhost:3000` and verify that the server is running locally.



# Development

## Linking up Remote Database on Heroku

### CLI
1. Ensure that you have [Heroku](https://devcenter.heroku.com/articles/heroku-cli#download-and-install) installed.

2. Obtain a session to your Heroku account (you will need to login via the opened browser):

    ```bash
    $ heroku sessions
    ```

3. Spawn the CLI database shell using Heroku (`psql` command must be on your PATH):

    ```bash
    $ heroku pg:psql <HEROKU_PGSQL_INSTANCE_NAME> --app <YOUR_HEROKU_APP_NAME>
    ```

### Web Application Dashboard
1. Login to your Heroku and access the project's [dashboard](https://dashboard.heroku.com/).
2. Navigate to the `Resources` tab and click `Heroku Postgres`.
3. In the new tab, click on `Settings` > `View Credentials`
4. Start your pgAdmin instance and right-click on the `Servers` label on the left side-bar. Select `Create > Server`.
5. **General** Tab: Fill in "Heroku" (or any preferred name).
  
   **Connection** Tab: Fill in `Host`, `Port`, `Username` and `Password` according to the data on Heroku Postgres page.

   **Advanced** Tab: Fill in `DB Restriction` with `Database` from Heroku Postgres page.
6. Afterwards, you can use pgAdmin to interact with the remote database on Heroku.

----

## Debugging

[Visual Studio Code](https://code.visualstudio.com/download) is a useful editor since there is a built-in NodeJS debugger.

1. Enabling the node debugger: `File > Preferences > Settings > Search "node debug" > Set "Debug > Node: Auto Attach" to "on"`

2. Start the NodeJS Application via Code (`F5` or `Run > Start Debugging`).

[Google Chrome DevTools](https://www.digitalocean.com/community/tutorials/how-to-debug-node-js-with-the-built-in-debugger-and-chrome-devtools#step-3-%E2%80%94-debugging-nodejs-with-chrome-devtools) is an alternative if you like Chrome that much...

[RTFM](https://nodejs.org/en/docs/guides/debugging-getting-started/) for further reading.

----

## Model
* `/sql/` directory contains all things SQL (i.e. DB tables `CREATE` and `DROP` queries):
    * `pg_create_database.sql` creates the database to be used (the database name inside (`petcare`) is used as part of the `DATABASE_URL` key in your `.env` file)
    * `pg_create_tables.sql` creates all the tables used by PetCare.
	* `pg_create_procedure.sql` creates all the stored procedures used by PetCare.
    * `pg_functions_triggers.sql` initializes the functions and triggers used by PetCare.
    * `pg_insert_rows.sql` inserts rows into the existing tables.
    * `pg_drop_{database, tables, triggers}.sql` drops existing database/tables/triggers.
    * `app_queries.js` contains all SQL queries used by PetCare. Please ensure that the queries are grouped together for each end-point.

## View
* `/public/` directory contains static resources (i.e. CSS and images).
* `/views/` directory is used for the front-end design.

## Controller
* `/auth/init.js` contains the overridden implementation of the `passport` node_module.
* `/routes/init.js` is where the mapping of the front-end to back-end logic occur.



# References
This project's codebase was built on top of Prof Adi's [template repository](https://github.com/thisisadiyoga/cs2102_ay1819_s2)
