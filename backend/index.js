const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/', {
    dbName: 'chathavendb',
    useNewUrlParser: true,
    useUnifiedTopology: true
}, err => err ? console.log(err) :
    console.log('Connected to ChatHaven Database'));

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: false,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
});
const User = mongoose.model('User', UserSchema);
User.createIndexes(); // More read operations than write operations (Better time complexity)

const express = require('express');
const backend = express();
const cors = require('cors');
console.log("Backend is listening on port 5000");
backend.use(express.json());
backend.use(cors());
backend.get('/', (req, res) => {
    res.send('Backend is running');
});

backend.post('/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        let result = await newUser.save();
        result = result.toObject();
        if (result) {
            delete result.password;
            res.send(req.body);
            console.log(result);
        } else {
            console.log('User already registered');
        }
    } catch (err) {
        res.send("Something went wrong");
    }
});
backend.listen(5000);