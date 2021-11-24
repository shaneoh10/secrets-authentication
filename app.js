require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ------------------------------------- DB SETUP

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

// ------------------------------------- USER AUTH SETUP

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

// ------------------------------------- ROUTES

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/secrets');
    }
);

app.route('/register')
    .get((req, res) => {
        res.render('register');
    })
    .post((req, res) => {
        User.register({ username: req.body.email }, req.body.password, (err, user) => {
            if (err) {
                console.log(err);
                res.redirect('/register');
            } else {
                res.redirect('/login');
            }
        });
    });

app.route('/login')
    .get((req, res) => {
        res.render('login');
    })
    .post((req, res) => {
        const user = new User({
            username: req.body.email,
            password: req.body.password
        });

        req.login(user, (err) => {
            if (err) {
                console.log(err);
            } else {
                res.redirect('/secrets');
            }
        });
    });

app.route('/secrets')
    .get((req, res) => {
        User.find({'secret': {$ne: null}}, (err, foundUsers) => {
            if (err) {
                console.log(err);
            } else {
                res.render('secrets', {usersWithSecrets: foundUsers});
            }
        });
    });

app.route('/submit')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.render('submit');
        } else {
            res.redirect('/login');
        }
    })
    .post((req, res) => {
        const submittedSecret = req.body.secret;

        User.findById(req.user.id, (err, foundUser) => {
            if (err) {
                console.log(err);
            } else {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect('/secrets');
                });
            }
        });
    });

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
});

// ------------------------------------- SERVER

app.listen(3000, () => {
    console.log('Server started on port 3000.');
});