/* eslint-disable prettier/prettier */
const Transaction = require('../models/transactionModel')
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');
const Payment = require('../utils/paystack')


exports.getAllTransaction = catchAsync(async (req, res, next) => {
    
    let filter = {};
    if (req.params.transactionId) filter = { tansaction: req.params.transactionId };

    ///QUERY EXECUTION
    const features = new APIFeatures(Transaction.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await features.query;

    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      results: doc.length,
      data: {
        data: doc
      }
    });
  });

exports.creditWallet = catchAsync(async (req, res, next) => {

  let userAccDetails = {
    accountNumber: req.body.accountNumber,
    email: req.body.emailAddress,
    bankName: req.body.bankName,
    amount: req.body.amount,
    birthday: req.body.birthday
  }
  
  let payResponse = Payment.creditPaystack(userAccDetails);
    
  let doc;
    
  if (payResponse && payResponse.hasOwnProperty("status") && payResponse.status === "success") {
        
    let user = await User.findById(req.params.userId);
        
    let balance = user.balance + req.body.amount

        doc = await Transaction.create({
            amount: req.body.amount,
            transactionType: "credit",
            reference: payResponse.reference,
            accountNumber: req.body.accountNumber,
            status: "successful"
        })

        user.balance = balance;

        await user.save();
    }else{
        res.status(201).json({
          status: 'fail',
          data: {
            data: {}
          }
        });
    }

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
});
  
exports.debitWallet = catchAsync(async (req, res, next) => {

    payResponse = await Payment.debitPaystack(req.body.accountNumber, req.body.bankName, req.body.amount);
    
    let doc;
    
    if (payResponse && payResponse.hasOwnProperty("status") && payResponse.status === "success") {
        
        let user = await User.findById(req.params.userId);

        if (req.body.amount <= user.balance) {
            
          user.balance = user.balance - req.body.amount;
        }

        doc = await Transaction.create({
            amount: req.body.amount,
            transactionType: "debit",
            reference: payResponse.data.reference,
            accountNumber: req.body.accountNumber,
            status: "successful"
        })

        await user.save();  
        
    }else{
        res.status(201).json({
          status: 'fail',
          data: {
            data: {}
          }
        });
    }

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
});

exports.getTransaction = catchAsync(async (req, res, next) => {
    
    let query = Transaction.findById(req.params.id);

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.updateTransaction = catchAsync(async (req, res, next) => {

    const doc = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
});

exports.deleteTransaction = catchAsync(async (req, res, next) => {

    const doc = await Transaction.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  });