/* eslint-disable prettier/prettier */
const crypto = require('crypto');
const {promisify} = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync'); 
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email')

const signToken = id => {
    return jwt.sign(
        { id: id }, 
        process.env.JWT_SECRET, 
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    //remove the password from the output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user: user
        }
    });    
}

exports.signup =  catchAsync(async (req, res, next) => {

    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    });

    createSendToken(newUser, 201, res);
});

exports.login = catchAsync (async(req, res, next) => {
    const {email, password} = req.body;

    if(!email || !password){

        return next(new AppError('Please provide email and password!', 400));
    }

    const user = await User.findOne({ email }).select('+password'); 

    if(!user || !await user.correctPassword(password, user.password)){

        return next(new AppError('Incorrect email or password', 401));
    }

     createSendToken(user, 200, res);    
});

//protecting route using a middleware function
exports.protect = catchAsync(async (req, res, next) => {
    //Getting token and check if it's there
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        
        token = req.headers.authorization.split(' ')[1];

    } 

    if(!token){
        return next(new AppError('You are not logged in! Please log in to get access', 401));
    }

    //validate token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //check if user still exists
    const currentUser = await User.findById(decoded.id);
    if(!currentUser){
        return next(new AppError('The user belongging to this token no longer exists', 401));
    }

    //check if user changed password after the token was issued
    if(currentUser.changePasswordAfter(decoded.iat)){
        return next(new AppError('User recently changed password! Please log in again.', 401));
    }

    //Grant access to protected route
    req.user = currentUser;

    next();
});

 
exports.forgotPassword = catchAsync(async (req, res, next) => {
    //get user based on posted email
    const user = await User.findOne({ email: req.body.email });

    if(!user){
        return next(new AppError('There is no user with this email address.', 404));
    }
    
    //generate the random token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    //send it back as an email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a Patch request with your new password and
    confirmPassword to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    try{
        await sendEmail({
            email: user.email,
            subject: 'Your password rest token (valid for 10 min)',
            message
        });
        
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email'
        })

    } catch (error){
         
        user.passwordReserToken = undefined;
        user.passwordReserExpires = undefined;  

        await user.save({ validateBeforeSave: false });

        return next(new AppError('There was an error sending the email, Try again later', 500));
    }
});

exports.resetPassword = catchAsync (async (req, res, next) => {
    //Get user based on the token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({ 
        passwordResetToken: hashedToken, 
        passwordResetExpires: {$gt: Date.now()}
        });    
    //If token has not expired, and there is user, set the new password
    if(!user){

        return next(new AppError('Token is invalid or has expired', 400));
    }

    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    //Update changedPasswordAt property for the user

    //Log the user in, send JWT
    createSendToken(user, 200, res);      
    
});

exports.updatePassword = catchAsync (async(req, res, next) => {
    //Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    //check if posted password is correct
    if(!(await user.correctPassword(req.body.currentPassword, user.password))){
        return next(new AppError('Your current password is wrong.', 401))
    }

    //If so, update the password
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    await user.save();
    
    //Log user in, send JWT
    createSendToken(user, 200, res);
})