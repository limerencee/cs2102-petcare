const sql_query = require('../sql/app_queries');

const passport = require('passport');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;

const adminCheck = require('./admincheck');
const antiAdminCheck = require('./antiadmin');
const authMiddleware = require('./middleware');
const antiMiddleware = require('./antimiddle');

// Postgre SQL Connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function findUser (username, callback) {
  user = {};
  pool.query(sql_query.query.userpass, [username], (err, data) => {
    if(err) {
      console.error("Cannot find user");
      return callback(null);
    }
    
    if(data.rows.length == 0) {
      console.error("User does not exists?");
      return callback(null)
    } else if(data.rows.length == 1) {
        user.username = data.rows[0].username;
        user.passwordHash = data.rows[0].password;
        user.email = data.rows[0].email;
        user.type = data.rows[0].type;
        user.gender = data.rows[0].gender;
        user.card_name = data.rows[0].card_name;
        user.card_no = data.rows[0].card_no;
        user.card_cvv = data.rows[0].cvv;
        user.card_expiry = data.rows[0].card_expiry_date;
        user.cash = data.rows[0].cash;
        user.is_pet_owner = data.rows[0].is_pet_owner;
        //Check if user is caretaker
        pool.query(sql_query.query.user_is_caretaker, [username], (err, data1) => {
          user.is_caretaker = data1.rows.length == 1 ? true : false;
          user.basis = data1.rows.length == 1 ? data1.rows[0].type : null;
          return callback(null, user);
        });
    } else {
      console.error("More than one user?");
      return callback(null);
    }
  });
}

passport.serializeUser(function (user, cb) {
  cb(null, user.username);
})

passport.deserializeUser(function (username, cb) {
  findUser(username, cb);
})

function initPassport () {
  passport.use(new LocalStrategy(
    (username, password, done) => {
      findUser(username, (err, user) => {
        if (err) {
          return done(err);
        }

        // User not found
        if (!user) {
          console.error('User not found');
          return done(null, false);
        }

        // Always use hashed passwords and fixed time comparison
        bcrypt.compare(password, user.passwordHash, (err, isValid) => {
          if (err) {
            return done(err);
          }
          if (!isValid) {
            return done(null, false);
          }
          return done(null, user);
        })
      })
    }
  ));

  passport.checkAdmin = adminCheck;
  passport.antiAdminCheck = antiAdminCheck;
  passport.authMiddleware = authMiddleware;
  passport.antiMiddleware = antiMiddleware;
  passport.findUser = findUser;
}

module.exports = initPassport;
