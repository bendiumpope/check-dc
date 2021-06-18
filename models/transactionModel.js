const mongoose = require('mongoose');
const User = require('./userModel');

// const validator = require('validator');

const transactionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: [true,'A transaction must have an amount'],
        trim: true
        // validate: [validator.isAlpha, 'A tour name must only contain characters']
    },
    accountNumber: {
        type: String,
        required: [true, 'A transaction must have an account number']  
    },
    transactionType: {
        type: String,
        required: [true, 'A transaction must have a type']
    },
    reference: {
        type: String,
        required: false
    },
    status: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    ///Referencing the creator using their ID
    creator: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
},

{
    toJSON:{ virtuals: true },
    toObject: { virtual: true }
});

///populating the creator field using referencing
transactionSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'creator',
        select: '-__v -passwordChangedAt'
    })

    next();
});



const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
