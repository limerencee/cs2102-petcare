const sql_query = require('../sql/app_queries');
const passport = require('passport');
const bcrypt = require('bcrypt');

// Postgre SQL Connection
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const round = 10;
const salt  = bcrypt.genSaltSync(round);

function initRouter(app) {
    /* GET */
    app.get('/'      , passport.antiMiddleware(), index);
    app.get('/register' , passport.antiMiddleware(), register);
    app.get('/login' 	, passport.antiMiddleware(), login);
    app.get('/password' , passport.antiMiddleware(), retrieve);
    
    /* POST */
    app.post('/register'   , passport.antiMiddleware(), reg_user);

    /* PROTECTED GET*/
    app.get('/profile', passport.authMiddleware(), profile_page);
    
    /* PROTECTED POST*/
    app.post('/update_info', passport.authMiddleware(), update_info);
    app.post('/update_pass', passport.authMiddleware(), update_pass);
    app.post('/update_card_info', passport.authMiddleware(), update_card_info);
    app.post('/top_up', passport.authMiddleware(), top_up);
    
    /* PROTECTED GET ADMIN */
    app.get('/admin_dashboard'  , passport.checkAdmin(), admin_dashboard);
    app.get('/admin_users'      , passport.checkAdmin(), admin_users);
    app.get('/admin_bids'       , passport.checkAdmin(), admin_bids);
    app.get('/admin_pets'       , passport.checkAdmin(), admin_pets);

    /* PROTECTED POST ADMIN */
    app.post('/admin_pets' , passport.checkAdmin(), add_pet_type);
    app.post('/admin_users_payroll', passport.checkAdmin(), get_user_payroll);
    app.post('/admin_reject_application', passport.checkAdmin(), reject_application);
    app.post('/admin_approve_application', passport.checkAdmin(), approve_application);
    app.post('/create_admin_account', passport.checkAdmin(), create_admin_account);
    app.post('/fire_caretaker', passport.checkAdmin(), fire_caretaker);
    app.post('/delete_account', passport.checkAdmin(), delete_account)

    /* PROTECTED GET USER */
    app.get('/dashboard'		, passport.antiAdminCheck(), dashboard);
    app.get('/jobs'             , passport.antiAdminCheck(), jobs);
    app.get('/biddings'         , passport.antiAdminCheck(), biddings);
    app.get('/pets'             , passport.antiAdminCheck(), user_pets);

    /* PROTECTED POST USER */
    app.post('/pets_add'        , passport.antiAdminCheck(), add_pet);
    app.post('/pets_delete'     , passport.antiAdminCheck(), delete_pet);
    app.post('/pets_update'     , passport.antiAdminCheck(), update_pet);
    app.post('/add_work_leave'  , passport.antiAdminCheck(), add_work_leave);
    app.post('/delete_work_leave', passport.antiAdminCheck(), delete_work_leave);
    app.post('/accept_job'      , passport.antiAdminCheck(), accept_job);
    app.post('/decline_job'     , passport.antiAdminCheck(), decline_job);
    app.post('/add_review'      , passport.antiAdminCheck(), add_review);
    app.post('/cancel_bid'      , passport.antiAdminCheck(), cancel_bid);
    app.post('/add_care_pet_type', passport.antiAdminCheck(), add_care_pet_type);
    app.post('/get_caretaker_reviews', passport.antiAdminCheck(), get_caretaker_review);
    app.post('/submit_bid', passport.antiAdminCheck(), submit_bid);

    /* LOGIN */
    app.post('/login', function(req, res, next) {
        passport.authenticate('local', function(err, user, info) {
            if (err) { return next(err); }
            if (!user) { return res.redirect('/login?login=fail'); }
            req.logIn(user, function(err) {
                if (err) { return next(err); }
                if (user.type === 'admin') { return res.redirect('/admin_dashboard'); }
                else { return res.redirect('/dashboard'); }
            })
        }) (req, res, next);
    });
    
    /* LOGOUT */
    app.get('/logout', passport.authMiddleware(), logout);
}


/*
===========================
    Auxiliary Functions
===========================
*/
function basic(req, res, page, other) {
    var info = {
        page: page,
        username: req.user.username,
        email: req.user.email,
        type: req.user.type,
        gender: req.user.gender,
        card_name: req.user.card_name,
        card_no: req.user.card_no,
        card_cvv: req.user.card_cvv,
        card_expiry: req.user.card_expiry,
        cash: req.user.cash,
        is_pet_owner: req.user.is_pet_owner,
        is_caretaker: req.user.is_caretaker,
        basis: req.user.basis
    };
    if(other) {
        for(var fld in other) {
            info[fld] = other[fld];
        }
    }
    res.render(page, info);
}
function query(req, fld) {
    return req.query[fld] ? req.query[fld] : '';
}
function msg(req, fld, pass, fail) {
    var info = query(req, fld);
    return info ? (info=='pass' ? pass : fail) : '';
}


/*
====================================
    Administrative User Routings
====================================
*/
async function admin_dashboard(req, res, next) {
    var jobApplication = []
    var topEarner = []
    await pool.query(sql_query.query.fetch_job_application, [])
        .then(data => {
            if (!data.rows || data.rows.length == 0) {
                jobApplication = [];
            } else {
                jobApplication = data.rows;
            }
        })
        .catch(function(err) {
            jobApplication = [];
        });
    await pool.query(sql_query.query.fetch_top_10_ctakers_earnings, []) 
    .then(data => topEarner = data.rows)
    .catch(function(err) {
        console.error("Error in fetching information about the top 10 earners");
    })
    basic(req, res, 'admin_dashboard', {
        auth: true,
        page: 'admin_dashboard',
        status_approved: query(req, 'approve'),
        approved_msg: msg(req, 'approve', 'Job application has been approved', 'Error in approving job application'),
        status_reject: query(req, 'reject'),
        reject_msg: msg(req, 'reject', 'Job application has been rejected', 'Error in rejecting job application'),
        jobApplication: jobApplication,
        topEarner: topEarner,
    });
}

function admin_pets(req, res, next) {
    var pet_types_table;
    pool.query(sql_query.query.all_pet_types, (err, data) => {
        if(err || !data.rows || data.rows.length == 0) {
            pet_types_table = [];
        } else {
            pet_types_table = data.rows;
        }
        basic(req, res, 'admin_pets', {
            auth: true,
            page: 'admin_pets',
            status_add: query(req, 'add'),
            add_msg: msg(req, 'add', 'Pet Type added successfully', 'Error in adding Pet Type'),
            pet_types_table: pet_types_table
        });
    });
}

function add_pet_type(req, res, next) {
    var petType  = req.body.petType;
    var basePrice  = req.body.basePrice;
    pool.query(sql_query.query.add_pet_type, [petType, basePrice], (err, data) => {
        if(err) {
            console.error("Error in adding pet");
            res.redirect('/admin_pets?add=fail');
        } else {
            res.redirect('/admin_pets?add=pass');
        }
    });
}

function admin_bids(req, res, next) {
    var bidList = [];
    pool.query(sql_query.query.fetch_all_biddings, [], (err, data) => {
        if (err) {
            console.log("Error in fetching from bid table");
        } else {
            bidList = data.rows;
            for (var i = 0; i < bidList.length; i++) {
                
                bidList[i].start_date = convertDate(new Date(bidList[i].start_date));
                bidList[i].end_date = convertDate(new Date(bidList[i].end_date));
            }
        }
        basic(req, res, 'admin_bids', {
            auth: true,
            page: 'admin_bids',
            bidList: bidList
        });
    })
}

async function admin_users(req, res, next) {
    var caretakersList = [];
    var petownersList = [];
    var noRoleUserList = [];
    var adminList = [];
    await pool.query(sql_query.query.fetch_ctakers, [])
    .then(data => caretakersList = data.rows)
    .catch(function(err) {
        console.error("Error in fetching from caretakers table");
    })

    await pool.query(sql_query.query.fetch_petowners, []) 
    .then(data => petownersList = data.rows)
    .catch(function(err) {
        console.error("Error in fetching from users table");
    })

    await pool.query(sql_query.query.fetch_new_inactive_users, []) 
    .then(data => {
        noRoleUserList = data.rows;
        for (var i = 0; i < noRoleUserList.length; i++) {
            noRoleUserList[i].created_at = convertDate(new Date(noRoleUserList[i].created_at));
        }
    })
    .catch(function(err) {
        console.error("Error in fetching from users table");
    })

    await pool.query(sql_query.query.fetch_admin, []) 
    .then(data => adminList = data.rows)
    .catch(function(err) {
        console.error("Error in fetching from users table");
    })

    basic(req, res, 'admin_users', {
        auth: true,
        page: 'admin_users',
        caretakersList: caretakersList,
        petownersList: petownersList,
        noRoleUserList: noRoleUserList,
        adminList: adminList,
        status_fireCaretaker: query(req, 'fireCaretaker'),
        fireCaretaker_msg: msg(req, 'fireCaretaker', 'Caretaker has been fired', 'Error in firing caretaker'),
        status_delUser: query(req, 'delUser'),
        delUser_msg: msg(req, 'delUser', 'User has been deleted', 'Error in deleting user'),
        status_addAdminAccount: query(req, 'addAdminAccount'),
        addAdminAccount_msg: msg(req, 'addAdminAccount', "Admin account has created", "Error in creating admin account")
    });
}

function get_user_payroll(req, res, next) {
    var username = req.body.username;
    var payroll = [];
    var topPetTypeForEachCaretaker = []
    pool.query(sql_query.query.get_payroll_for_ctaker, [username], (err, data) => {
        if (err) console.error("Error in fetching payroll");
        else payroll = data.rows;
        pool.query(sql_query.query.caretaker_top_pet_type, [username], (err, data) => {
            if (err) console.error("Error in fetching information about the top pet type for each caretaker");
            else topPetTypeForEachCaretaker = data.rows;
            res.json({
                payroll: payroll, 
                topPetTypeForEachCaretaker: topPetTypeForEachCaretaker
            });
        })
    });
}

function reject_application(req, res, next) {
    var caretakerName = req.body.caretakerName;
    pool.query(sql_query.query.reject_job_application, [caretakerName], (err, data) => {
        if(err) {
            console.error("Error in deleting caretaker");
            res.redirect('/admin_dashboard?reject=fail');
        } else {
            res.redirect('/admin_dashboard?reject=pass');
        }
    });
}

function approve_application(req, res, next) {
    var caretakerName = req.body.caretakerName;
    pool.query(sql_query.query.approve_job_application, [caretakerName], (err, data) => {
        if(err) {
            console.error("Error in approving caretaker");
            res.redirect('/admin_dashboard?approve=fail');
        } else {
            res.redirect('/admin_dashboard?approve=pass');
        }
    });
}

function create_admin_account(req, res, next) {
    var username = req.body.username;
    var password = bcrypt.hashSync(req.body.password, salt);
    var email = req.body.email;
    var gender = req.body.gender.toLowerCase();
    pool.query(sql_query.query.add_admin, [username, password, email, gender], (err, data) => {
        if(err) {
            console.error("Error in adding admin", err);
            res.redirect('/admin_users?addAdminAccount=fail');
        } else {
            res.redirect('/admin_users?addAdminAccount=pass');
        }
    });
}

function fire_caretaker(req, res, next) {
    var username = req.body.caretakerName;
    pool.query(sql_query.query.fire_caretaker, [username], (err, data) => {
        if (err) {
            console.error("Error in firing caretaker", err);
            res.redirect('/admin_users?fireCaretaker=fail');
        } else {
            res.redirect('/admin_users?fireCaretaker=pass');
        }
    });
}

function delete_account(req, res, next) {
    var username = req.body.username;
    pool.query(sql_query.query.delete_user, [username], (err, data) => {
        if (err) {
            console.error("Error in deleting users", err);
            res.redirect('/admin_users?delUser=fail');
        } else {
            res.redirect('/admin_users?delUser=pass');
        }
    });
}

/*
=============================
    Regular User Routings
=============================
*/

async function dashboard(req, res, next) {
    var query_objects = req.query
    var dashboard_search_params_list = ['petType', 'price', 'rating', 'startDate', 'endDate']
    var query_params_list = Object.keys(query_objects)
    var check_params = query_params_list.every((e1) => {return dashboard_search_params_list.indexOf(e1) !== -1})
    
    var petTypeList = []

    await pool.query(sql_query.query.all_pet_types).then(data => {
        petTypeList = data.rows.length == 0 ? [] : data.rows
    }).catch(function (err) {
        petTypeList = []
    })

    if (query_params_list.length == 5 && check_params ) {
        var username = req.user.username
        var pet_type = req.query.petType
        
        var daily_price = req.query.price
        var daily_price_lower_limit = -1
        var daily_price_upper_limit = 100000
        if (daily_price != 'All') {
            daily_price_array = daily_price.split("-")
            daily_price_lower_limit = daily_price_array[0]
            daily_price_upper_limit = daily_price_array[1]
        }
        var rating = req.query.rating
        if(rating != 'All') {
            rating = rating.replace('>', '')
        } else {
            rating = 0
        }
        
        var start_date = req.query.startDate
        var end_date = req.query.endDate

        var searchresults = [];
        var user_petlist =[]
        var daily_price_unit = 0
        await pool.query(sql_query.query.query_price_pet_type, [pet_type]).then(data => {
            daily_price_unit = data.rows[0].daily_base_price
        }).catch(function(err) {
                console.error("Error when querying DB: " + err)
                res.redirect('/dashboard')
        })

        await pool.query(sql_query.query.search_caretaker_pt_ft, [start_date,end_date,rating, daily_price_lower_limit, 
            daily_price_upper_limit, daily_price_unit, pet_type]).then(data => {
            searchresults = data.rows.length == 0 ? [] : data.rows
        }).catch(function(err) {
                console.error("Error when querying DB: " + err)
                res.redirect('/dashboard')
        })
        
        await pool.query(sql_query.query.query_pets_list_bidding_selection, [username, pet_type,start_date,end_date]).then(data=> {
            user_petlist = data.rows.length == 0 ? [] : data.rows
        }).catch(function (err) {
            user_petlist = []
        })
        
        basic(req, res, 'dashboard', {
            auth: true,
            caretakerData: searchresults,
            petTypeList: petTypeList,
            userpetlist: user_petlist,
            startdate : start_date,
            enddate: end_date,
            search: true
        })
    } else {
        var user_petlist = []

        basic(req, res, 'dashboard', { 
            auth: true,
            caretakerData: [],
            petTypeList: petTypeList,
            userpetlist: user_petlist,
            startdate : "01-01-2000",
            enddate: "01-01-2000",
            search: false
        });
    }
}

function submit_bid(req, res, next) {
    var username = req.user.username
    var ct_username = req.body.ct_username
    var pet_name = req.body.petName
    var start_date = req.body.startDate
    var end_date = req.body.endDate
    //var date_diff = days_date_between(start_date, end_date)
    var transfer_method = req.body.transferMethod
    var payment_method = req.body.paymentMethod
    var bid_price = req.body.bidprice


    pool.query(sql_query.query.add_bidding, [username, ct_username, pet_name, start_date, end_date, payment_method, transfer_method, bid_price], (err, data) => { 
        if(err) {
            console.log("Error in bidding", err);
            res.redirect('/biddings?bid=fail')
        } else {
            res.redirect('/biddings?bid=pass');
        }
    } )

    
    
}


async function jobs(req, res, next) {
    if (!req.user.is_caretaker) { res.redirect('/dashboard'); }
    var username = req.user.username;
    var currentDate = new Date();
    var incoming_offers, completed_jobs, current_jobs, upcoming_jobs, pt_availability, ft_leave, summary;

    await pool.query(sql_query.query.fetch_ctaker_offers, [username])
        .then(data => {
            incoming_offers = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < incoming_offers.length; i++) {
                incoming_offers[i].start_date = convertDate(new Date(incoming_offers[i].start_date));
                incoming_offers[i].end_date = convertDate(new Date(incoming_offers[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });
    await pool.query(sql_query.query.fetch_completed_jobs, [username, currentDate])
        .then(data => {
            completed_jobs = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < completed_jobs.length; i++) {
                completed_jobs[i].start_date = convertDate(new Date(completed_jobs[i].start_date));
                completed_jobs[i].end_date = convertDate(new Date(completed_jobs[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });
    await pool.query(sql_query.query.fetch_current_jobs, [username, currentDate])
        .then(data => {
            current_jobs = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < current_jobs.length; i++) {
                current_jobs[i].start_date = convertDate(new Date(current_jobs[i].start_date));
                current_jobs[i].end_date = convertDate(new Date(current_jobs[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });
    await pool.query(sql_query.query.fetch_upcoming_jobs, [username, currentDate])
        .then(data => {
            upcoming_jobs = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < upcoming_jobs.length; i++) {
                upcoming_jobs[i].start_date = convertDate(new Date(upcoming_jobs[i].start_date));
                upcoming_jobs[i].end_date = convertDate(new Date(upcoming_jobs[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });
    await pool.query(sql_query.query.query_availability_pt, [username])
        .then(data => {
            pt_availability = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < pt_availability.length; i++) {
                pt_availability[i].start_date = convertDate(new Date(pt_availability[i].start_date));
                pt_availability[i].end_date = convertDate(new Date(pt_availability[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });
    await pool.query(sql_query.query.query_leaves_ft, [username])
        .then(data => {
            ft_leave = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < ft_leave.length; i++) {
                ft_leave[i].start_date = convertDate(new Date(ft_leave[i].start_date));
                ft_leave[i].end_date = convertDate(new Date(ft_leave[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });
    
    await pool.query(sql_query.query.fetch_caretaker_summary_this_month, [username, new Date().getMonth() + 1, new Date().getFullYear()])
        .then(data => summary = data.rows)
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });

    basic(req, res, 'jobs', {
        auth: true,
        incoming_offers: incoming_offers,
        completed_jobs: completed_jobs,
        current_jobs: current_jobs,
        upcoming_jobs: upcoming_jobs,
        pt_availability: pt_availability,
        ft_leave: ft_leave,
        summary: summary,
        status_pt_avail: query(req, 'partTimeAvail'),
        pt_avail_msg: msg(req, 'partTimeAvail', 'Availability added successfully', 'Error in adding availability'),
        status_ft_leave: query(req, 'fullTimeLeave'),
        ft_leave_msg: msg(req, 'fullTimeLeave', 'Leave added successfully', 'Error in adding leave'),
        status_isCaretaker: query(req, 'isCaretaker'),
        iscaretaker_msg: msg(req, 'isCaretaker', '', 'Unexpected Error'),
        status_onJob: query(req, 'onJob'),
        onJob_msg: msg(req, 'onJob', '', 'You have ongoing job(s) during that period'),
        status_workDays: query(req, 'workDays'),
        workDays_msg: msg(req, 'workDays', '', 'You have to work for a minimum of 2 x 150 consecutive days'),
        status_deleted_availability: query(req, 'deleted_availability'),
        deleted_availability_msg: msg(req, 'deleted_availability', 'Availability deleted successfully', 'Error in deleting availability'),
        status_deleted_work_leave: query(req, 'deleted_work_leave'),
        deleted_work_leave_msg: msg(req, 'deleted_work_leave', 'Leave deleted successfully', 'Error in deleting leave'),
        status_acceptedOffer: query(req, 'acceptedOffer'),
        acceptedOffer_msg: msg(req, 'acceptedOffer', 'Offer accepted successfully', 'Error in accepting offer'),
        status_rejectedOffer: query(req, 'rejectedOffer'),
        rejectedOffer_msg: msg(req, 'rejectedOffer', 'Offer rejected successfully', 'Error in rejecting offer'),
    });
}

async function biddings(req, res, next) {
    var username = req.user.username;
    var currentDate = new Date();
    var pet_owner_ongoing_biddings, pet_owner_past_biddings, ongoing_biddings;
    await pool.query(sql_query.query.fetch_petowner_ongoing_biddings, [username, currentDate])
        .then(data => {
            pet_owner_ongoing_biddings = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < pet_owner_ongoing_biddings.length; i++) {
                pet_owner_ongoing_biddings[i].start_date = convertDate(new Date(pet_owner_ongoing_biddings[i].start_date));
                pet_owner_ongoing_biddings[i].end_date = convertDate(new Date(pet_owner_ongoing_biddings[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });
    await pool.query(sql_query.query.fetch_petowner_past_biddings, [username, currentDate])
        .then(data => {
            pet_owner_past_biddings = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < pet_owner_past_biddings.length; i++) {
                pet_owner_past_biddings[i].start_date = convertDate(new Date(pet_owner_past_biddings[i].start_date));
                pet_owner_past_biddings[i].end_date = convertDate(new Date(pet_owner_past_biddings[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });
    await pool.query(sql_query.query.fetch_ongoing_biddings, [])
        .then(data => {
            ongoing_biddings = data.rows.length == 0 ? [] : data.rows;
            for (var i = 0; i < ongoing_biddings.length; i++) {
                ongoing_biddings[i].start_date = convertDate(new Date(ongoing_biddings[i].start_date));
                ongoing_biddings[i].end_date = convertDate(new Date(ongoing_biddings[i].end_date));
            }
        })
        .catch(function(err) {
            console.error("Error when querying DB: " + err);
            res.redirect('/dashboard');
        });

    basic(req, res, 'biddings', {
        auth: true,
        pet_owner_ongoing_biddings: pet_owner_ongoing_biddings,
        pet_owner_past_biddings: pet_owner_past_biddings,
        ongoing_biddings: ongoing_biddings,
        status_review: query(req, 'review'),
        review_msg: msg(req, 'review', 'Review added successfully', 'Error in adding review'),
        status_cancelledBid: query(req, 'cancelledBid'),
        cancelledBid_msg: msg(req, 'cancelledBid', 'Bid cancelled successfully', 'Error in cancelling bid'),
        status_bid: query(req, 'bid'),
        bid_msg: msg(req, 'bid', 'Bid submitted', 'Error in submitting bid'),
    });
}

function user_pets(req, res, next) {
    var username = req.user.username;
    var user_pets_table;
    var pet_types_table;
    pool.query(sql_query.query.user_pets, [username], (err, data) => {
        if(err || !data.rows || data.rows.length == 0) {
            user_pets_table = [];
        } else {
            user_pets_table = data.rows;
        }
        pool.query(sql_query.query.all_pet_types, (err, data) => {
            if(err || !data.rows || data.rows.length == 0) {
                pet_types_table = [];
            } else {
                pet_types_table = data.rows;
            }
            basic(req, res, 'pets', {
                auth: true,
                page: 'pets',
                status_add: query(req, 'add'),
                add_msg: msg(req, 'add', 'Pet added successfully', 'Error in adding pet'),
                status_delete: query(req, 'delete'),
                delete_msg: msg(req, 'delete', 'Pet deleted successfully', 'Error in deleting pet'),
                status_update: query(req, 'update'),
                update_msg: msg(req, 'update', 'Pet updated successfully', 'Error in updating pet'),
                user_pets_table: user_pets_table,
                pet_types_table: pet_types_table
            });
        });
    });
}

function add_pet(req, res, next) {
    var username = req.user.username;
    var petName  = req.body.petName;
    var petType  = req.body.petType;
    var petGender  = req.body.petGender ? req.body.petGender : null;
    var specialNeeds = req.body.specialNeeds ? req.body.specialNeeds : null;
    pool.query(sql_query.query.add_pet, [username, petName, petType, petGender, specialNeeds], (err, data) => {
        if(err) {
            console.error("Error in adding pet");
            res.redirect('/pets?add=fail');
        } else {
            res.redirect('/pets?add=pass');
        }
    });
}

function delete_pet(req, res, next) {
    var username = req.user.username;
    var petName  = req.body.petName;
    pool.query(sql_query.query.delete_pet, [username, petName], (err, data) => {
        if(err) {
            console.error("Error in deleting pet");
            res.redirect('/pets?delete=fail');
        } else {
            res.redirect('/pets?delete=pass');
        }
    });
}

function update_pet(req, res, next) {
    var username = req.user.username;
    var petName  = req.body.petName;
    var petType = req.body.petType;
    var petGender = req.body.petGender ? req.body.petGender : null;
    var specialNeeds = req.body.specialNeeds ? req.body.specialNeeds : null;
    pool.query(sql_query.query.update_pet, [username, petName, petType, petGender, specialNeeds], (err, data) => {
        if (err) {
            console.error("Error in deleting pet");
            res.redirect('/pets?update=fail');
        } else {
            res.redirect('/pets?update=pass');
        }
    });
}

async function add_work_leave(req, res, next) {
    var username = req.user.username;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var basis = req.user.basis;

    if (basis === "part-time") {
        // Insert availability
        await pool.query(sql_query.query.add_availability_pt, [username, startDate, endDate])
            .then(data => res.redirect('/jobs?partTimeAvail=pass'))
            .catch(function(err) {
                console.error(err);
                console.error("Part-timer failed to add availability.");
                res.redirect('/jobs?partTimeAvail=fail');
            });
    } else if (basis === "full-time") {
        var currentDate = new Date();
        var upcomingJobs;

        await pool.query(sql_query.query.fetch_upcoming_jobs, [username, currentDate])
            .then(data => upcomingJobs = data.rows)
            .catch(function(err) {
                console.error("Failed to fetch current jobs for user");
                res.redirect('/jobs?isCaretaker=fail');
            });

        // Cannot take leave if caretaker has job
        upcomingJobs.forEach(function(job) {
            if ((job.start_date <= startDate && startDate <= job.end_date)
                || (job.start_date <= endDate && endDate <= job.end_date)
                || (job.start_date >= startDate && endDate >= job.end_date)) { 
                res.redirect('/jobs?onJob=fail');
            }
        });

        // Verify the amount of 150 working day blocks
        var firstDayDate = new Date(new Date(startDate).getFullYear(), 0, 1);
        var lastDayDate = new Date(new Date(endDate).getFullYear(), 11, 31);

        var pastLeaveBlocks;
        await pool.query(sql_query.query.query_past_leaves_ft, [username, currentDate])
            .then(data => pastLeaveBlocks = data.rows)
            .catch(function(err) {
                console.error("Failed to fetch caretaker current leaves");
                res.redirect('/jobs?isCaretaker=fail');
            });

        // Count number of 150 working days block thus far
        var workedBlocks = 0;

        if (pastLeaveBlocks.length > 0) {
            var interDate = firstDayDate;
            pastLeaveBlocks.forEach(function(pastLeaveBlock) {
                var start = new Date(pastLeaveBlock.start_date);
                var end = new Date(pastLeaveBlock.end_date);
                if (start.getFullYear() !== new Date().getFullYear()) return;
                var workedDays = Math.ceil((start.getTime() - interDate.getTime()) / (1000 * 3600 * 24));
                if (workedDays >= 150) {
                    workedBlocks += (workedDays / 150);
                }
                interDate = end;
            });
        } else {
            var workedDays = Math.ceil((new Date(startDate).getTime() - firstDayDate.getTime()) / (1000 * 3600 * 24));
            if (workedDays >= 150) {
                workedBlocks += (workedDays / 150);
            }
        }
        
        // Count remaining number of possible 150 working days block
        var upcomingLeaveBlocks;
        await pool.query(sql_query.query.query_upcoming_leaves_ft, [username, currentDate])
            .then(data => upcomingLeaveBlocks = data.rows)
            .catch(function(err) {
                console.error("Failed to fetch caretaker current leaves");
                res.redirect('/jobs?isCaretaker=fail');
            });
        // Assume that the current leave period being apply is accepted
        upcomingLeaveBlocks.push({start_date: startDate, end_date: endDate});

        // Check the possible blocks remaining by looping through the leaves
        var possibleBlocks = 0;
        interDate = currentDate;
        upcomingLeaveBlocks.forEach(function(upcomingLeaveBlock) {
            var start = new Date(upcomingLeaveBlock.start_date);
            var end = new Date(upcomingLeaveBlock.end_date);
            var possibleWorkDays = Math.ceil((start.getTime() - interDate.getTime()) / (1000 * 3600 * 24));
            if (possibleWorkDays >= 150) {
                possibleBlocks += (possibleWorkDays / 150);
            }
            interDate = end;
        });

        // Include end date of latest leave until last day of year
        var remainingDays = Math.ceil((lastDayDate.getTime() - interDate.getTime()) / (1000 * 3600 * 24));
        if (remainingDays >= 150) {
            possibleBlocks += (remainingDays / 150);
        }

        if ((workedBlocks + possibleBlocks) < 2) {
            console.log(workedBlocks + " " + possibleBlocks + ". Caretaker would not be able to satisfy 2x150 work days.");
            res.redirect('/jobs?workDays=fail');
        } else {
            // Insert leave
            await pool.query(sql_query.query.add_leaves_ft, [username, startDate, endDate])
                .then(data => res.redirect('/jobs?fullTimeLeave=pass'))
                .catch(function(err) {
                    console.error("Full-timer failed to add leave.");
                    res.redirect('/jobs?fullTimeLeave=fail');
                });
        }
    }
}

async function delete_work_leave(req, res, next) {
    var username = req.user.username;
    var basis = req.user.basis;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var currentDate = new Date();
    
    if (currentDate >= new Date(startDate)) { 
        if (req.user.basis === 'part-time') return res.redirect('/jobs?deleted_availability=fail'); 
        else if (req.user.basis === 'full-time') return res.redirect('/jobs?deleted_work_leave=fail'); 
    }

    if (basis === "part-time") {
        await pool.query(sql_query.query.delete_availability_pt, [username, startDate, endDate])
            .then(data => res.redirect('/jobs?deleted_availability=pass'))
            .catch(function(err) {
                console.error("Failed to delete availability");
                res.redirect('/jobs?deleted_availability=fail');
            });
    } else if (basis === "full-time") {
        await pool.query(sql_query.query.delete_leaves_ft, [username, startDate, endDate])
        .then(data => res.redirect('/jobs?deleted_work_leave=pass'))
        .catch(function(err) {
            console.error("Failed to delete leave");
            res.redirect('/jobs?deleted_work_leave=fail');
        });
    }
}

function accept_job(req, res, next) {
    var caretakerName = req.user.username;
    var ownerName = req.body.ownerName;
    var petName = req.body.petName;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    pool.query(sql_query.query.get_similar_bids, [ownerName, petName, startDate, endDate], (err, data) => {
        if (err) {
            console.error("Error when accepting job: " + err);
            return res.redirect('/jobs?acceptedOffer=fail');
        } else {
            if (data.rows.length == 0) {
                pool.query(sql_query.query.accept_ctaker_offer, [ownerName, caretakerName, petName, startDate, endDate], (err, data) => {
                    if (err) {
                        console.error("Error when accepting job: " + err);
                        return res.redirect('/jobs?acceptedOffer=fail');
                    } else {
                        pool.query(sql_query.query.deduct_funds, [ownerName, caretakerName, petName, startDate, endDate], (err, data) => {
                            if (err) {
                                console.error("Error when accepting job: " + err);
                                return res.redirect('/jobs?acceptedOffer=fail');
                            } else {
                                return res.redirect('/jobs?acceptedOffer=pass')
                            }
                        })
                    }
                })
            } else {
                return res.redirect('/jobs?acceptedOffer=fail');
            }
        }
    });
}

async function decline_job(req, res, next) {
    var caretakerName = req.user.username;
    var ownerName = req.body.ownerName;
    var petName = req.body.petName;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;

    await pool.query(sql_query.query.reject_ctaker_offer, [ownerName, caretakerName, petName, startDate, endDate])
        .then(data => res.redirect('/jobs?rejectedOffer=pass'))
        .catch(function(err) {
            console.error("Error when rejecting job: " + err);
            res.redirect('/jobs?rejectedOffer=fail');
        });
}

async function add_review(req, res, next) {
    var petOwner = req.user.username;
    var caretaker = req.body.caretakerName;
    var petName = req.body.petName;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    var review = req.body.review;
    var rating = req.body.rating;

    await pool.query(sql_query.query.add_review, [review, rating, petOwner, caretaker, petName, startDate, endDate])
        .then(data => res.redirect('/biddings?review=pass'))
        .catch(function(err) {
            console.error("Error when adding review: " + err);
            res.redirect('/biddings?review=fail');
        });
}

async function cancel_bid(req, res, next) {
    var ownerName = req.user.username;
    var caretakerName = req.body.caretakerName;
    var petName = req.body.petName;
    var startDate = req.body.startDate;
    var endDate = req.body.endDate;
    await pool.query(sql_query.query.cancel_bid, [ownerName, caretakerName, petName, startDate, endDate])
        .then(data => res.redirect('/biddings?cancelledBid=pass'))
        .catch(function(err) {
            console.error("Error when rejecting bid: " + err);
            res.redirect('/biddings?cancelledBid=fail');
        });
}
    
async function add_care_pet_type(req, res, next) {
    var username = req.user.username;
    var petType = req.body.petType;
    var jobType = req.body.job_type;
    if (Array.isArray(petType)) {
        pool.query(sql_query.query.add_caretaker, [username, jobType])
        .then(data => {
            for (var i = 0; i < petType.length; i++) {
                pool.query(sql_query.query.add_caretaker_pet_type, [username, petType[i]])
            }
        })
        .then(data => res.redirect('/profile?addPetType=pass'))
        .catch(err => {
            console.error("Error when adding pet types: " + err);
            res.redirect('/profile?addPetType=fail');
        });
    } else {
        pool.query(sql_query.query.add_caretaker, [username, jobType])
        .then(data => pool.query(sql_query.query.add_caretaker_pet_type, [username, petType]))
        .then(data => res.redirect('/profile?addPetType=pass'))
        .catch(err => {
            console.error("Error when adding pet types: " + err);
            res.redirect('/profile?addPetType=fail');
        });
    }
}

function get_caretaker_review(req, res, next) {
    var caretakerName = req.body.caretakerName;
    var petType = req.body.petType;
    var reviews = [];
    pool.query(sql_query.query.get_reviews_for_ctaker, [caretakerName, petType], (err, data) => {
        if (err) {
            console.error("Error in fetching payroll");
        } else {
            reviews = data.rows;
            for (var i = 0; i < reviews.length; i++) {
                reviews[i].start_date = convertDate(new Date(reviews[i].start_date));
                reviews[i].end_date = convertDate(new Date(reviews[i].end_date));
            }
        }
        res.json(reviews);
    });
}


/*
================================
    Unauthenticated Routings
================================
*/
function index(req, res, next) {
    if(!req.isAuthenticated()) {
        res.render('index', {
            page: '',
            auth: false,
        });
    } else {
        basic(req, res, 'index', {
            page: '', 
            auth: true, 
        });
    }
}

function register(req, res, next) {
    res.render('register', { 
        auth: false,
        page: 'register',
        status_reg: query(req, 'reg'),
        reg_msg: msg(req, 'reg', 'Registration successful', 'Registration failed')
    });
}

function reg_user(req, res, next) {
    var username  = req.body.username;
    var password  = bcrypt.hashSync(req.body.password, salt);
    var email = req.body.email;
    var gender = req.body.gender.toLowerCase();
    var card_name = req.body.card_name ? req.body.card_name : null;
    var card_no = req.body.card_no ? req.body.card_no : null;
    var card_cvv = req.body.cvv ? req.body.cvv : null;
    var card_expiry = req.body.card_expiry ? req.body.card_expiry : null;
    var cash = 0.0;
    pool.query(sql_query.query.add_user, [username,password,email,gender,card_name,card_no,card_cvv,card_expiry,cash], (err, data) => {
        if(err) {
            console.error("Error in adding user", err);
            res.redirect('/register?reg=fail');
        } else {
            req.login({
                username    : username,
                passwordHash: password
            }, function(err) {
                if(err) {
                    return res.redirect('/register?reg=fail');
                } else {
                    return res.redirect('/dashboard');
                }
            });
        }
    });
}

function retrieve(req, res, next) {
    res.render('retrieve', { page: 'retrieve', auth: false });
}

function login(req, res, next) {
    res.render('login', { 
        auth: false,
        page: 'login',
        status_login: query(req, 'login'),
        login_msg: msg(req, 'login', '', 'Incorrect username or password')
    });
}

function logout(req, res, next) {
    req.session.destroy()
    req.logout()
    res.redirect('/')
}


/*
==============================
    Authenticated Routings
==============================
*/

async function profile_page(req, res, next) {
    var petTypeList = [];
    var pending_job = false;
    var username = req.user.username;
    await pool.query(sql_query.query.is_pending_job_application, [username])
        .then(data => {
            if (!data.rows || data.rows.length == 0) {
                pending_job = false;
            } else {
                pending_job = true;
            }
        })
        .catch(function(err) {
            pending_job = false;
        });

    await pool.query(sql_query.query.all_pet_types, [])
        .then(data => {
            if (!data.rows || data.rows.length == 0) {
                petTypeList = [];
            } else {
                petTypeList = data.rows;
            }   
        })
        .catch(function(err) {
            petTypeList = [];
        });

    basic(req, res, 'profile', {
        auth: true,
        petTypeList: petTypeList,
        pending_job: pending_job,
        status_info: query(req, 'info'),
        update_info_msg: msg(req, 'info', 'Information updated successfully', 'Error in updating Information'),
        status_pass: query(req, 'pass'),
        pass_msg: msg(req, 'pass', 'Password updated successfully', 'Error in updating password'),
        status_card: query(req, 'ccard'),
        card_msg: msg(req, 'ccard', 'Credit Card updated successfully', 'Error in updating credit card details'),
        status_topup: query(req, 'topup'),
        topup_msg: msg(req, 'topup', 'Cash has been topped up', 'Error in topping up cash'),
        status_addPetType: query(req, 'addPetType'),
        addPetType_msg: msg(req, 'addPetType', 'Job application has been submitted', 'Error in applying job'),
    });
}

function update_info(req, res, next) {
    var username  = req.user.username;
    var email = req.body.email;
    var gender  = req.body.gender;
    pool.query(sql_query.query.update_info, [username, email, gender], (err, data) => {
        if(err) {
            console.error("Error in update info");
            res.redirect('/profile?info=fail');
        } else {
            res.redirect('/profile?info=pass');
        }
    });
}

function update_pass(req, res, next) {
    var username = req.user.username;
    var oldpassword = req.body.oldpassword;
    pool.query(sql_query.query.query_info, [username], (err, data) => {
        if (err || !data.rows || data.rows.length == 0) {
            console.error("Failed to fetch a valid user");
            res.redirect('/profile?pass=fail');
        } else {
            var result = bcrypt.compareSync(oldpassword, data.rows[0].password);
            if (!result) {
                console.error("Incorrect old password");
                res.redirect('/profile?pass=fail');
            } else {
                var password = bcrypt.hashSync(req.body.password, salt);
                pool.query(sql_query.query.update_pass, [username, password], (err, data) => {
                    if(err) {
                        console.error("Error in update pass");
                        res.redirect('/profile?pass=fail');
                    } else {
                        res.redirect('/profile?pass=pass');
                    }
                });
            }
        }
        
    });
    
}


function update_card_info(req, res, next) {
    var username  = req.user.username;
    var card_name = req.body.card_name;
    var card_no = req.body.card_no;
    var cvv = req.body.card_cvv;
    var card_expiry_date = req.body.card_expiry;
    pool.query(sql_query.query.update_card_info, [username, card_name, card_no, cvv, card_expiry_date], (err, data) => {
        if(err) {
            console.error("Error in update info");
            res.redirect('/profile?ccard=fail');
        } else {
            res.redirect('/profile?ccard=pass');
        }
    });
}

function top_up(req, res, next) {
    var username = req.user.username;
    var amount = req.body.amount;
    pool.query(sql_query.query.top_up_cash, [username, amount], (err, data) => {
        if (err) {
            console.error("Error in updating cash");
            res.redirect('/profile?topup=fail');
        } else {
            res.redirect('/profile?topup=pass');
        }
    });
}

/*
==============================
    Common Utilities
==============================
*/
function convertDate(date) {
    var day = ('0' + date.getDate()).slice(-2);
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var year = date.getFullYear();
    return month + "/" + day + "/" + year;
}


function days_date_between(start_date, end_date) {
    return Math.floor(( Date.parse(end_date) - Date.parse(start_date) ) / 86400000) + 1
}

module.exports = initRouter;