require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const md5 = require('md5');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// ------------------------------------- DB SETUP

mongoose.connect(process.env.MONGODB_URI);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = new mongoose.model('User', userSchema);

// ------------------------------------- ROUTES

app.get('/', (req, res) => {
    res.render('home');
});

app.route('/register')
    .get((req, res) => {
        res.render('register');
    })
    .post((req, res) => {
        const newUser = new User({
            email: req.body.email,
            password: md5(req.body.password)
        });

        newUser.save((err) => {
            if (err) {
                console.log(err);
            } else {
                res.render('secrets');
            }
        });
    });

app.route('/login')
    .get((req, res) => {
        res.render('login');
    })
    .post((req, res) => {
        const email = req.body.email;
        const password = md5(req.body.password);

        User.findOne({ email: email }, (err, foundUser) => {
            if (err) {
                console.log(err);
            } else {
                if (foundUser) {
                    if (foundUser.password === password) {
                        res.render('secrets');
                    }
                }
            }
        })
    });


app.listen(3000, () => {
    console.log('Server started on port 3000.')
});