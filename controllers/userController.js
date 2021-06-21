const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');



exports.getAllUsers = catchAsync(async (req, res, next) => {

  let filter = {};

  if (req.params.transactionId) filter = { tansaction: req.params.transactionId };
    ///QUERY EXECUTION
    const features = new APIFeatures(User.find(filter), req.query)
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

exports.getUser = catchAsync(async (req, res, next) => {
    let query = User.findById(req.params.id);

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


exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;

    next();
}

exports.updateMe = catchAsync(async (req, res, next) => {
    //Create error if user POSTs passward data
    if (req.body.password || req.body.confirmPassword){
        return next(new AppError('This route is not for password updates. Please use /updateMyPassword.', 400));
    }

    //Filtered out unwanted fields that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');

    //update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { 
        new: true,
        reunValidators: true
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
   await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
        data: null
    }); 
});

//Do not change password with this
exports.updateUser = catchAsync(async (req, res, next) => {
    const doc = await User.findByIdAndUpdate(req.params.id, req.body, {
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

exports.deleteUser = catchAsync(async (req, res, next) => {

    const doc = await User.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  });