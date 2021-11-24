require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

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
    password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ------------------------------------- ROUTES

app.get('/', (req, res) => {
    res.render('home');
});

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
        if (req.isAuthenticated()) {
            res.render('secrets');
        } else {
            res.redirect('/login');
        }
    });

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login');
})

app.listen(3000, () => {
    console.log('Server started on port 3000.')
});