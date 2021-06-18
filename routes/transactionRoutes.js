const express = require('express');
const transactionController = require('../controllers/transactionController');
const authController = require('../controllers/authController');


const router = express.Router();


router
    .route('/')
    .get(authController.protect, transactionController.getAllTransaction)

router
    .route('/credituser/:userId')
    .post(authController.protect, transactionController.creditWallet);

router
    .route('/debituser/:userId')
    .post(authController.protect, transactionController.debitWallet);
    
// router
//     .route('/transfer/:userId')
//     .post(authController.protect, transactionController.transferWallet);    

router
    .route('/:id')
    .get(transactionController.getTransaction)
    .delete(
        authController.protect,
        transactionController.deleteTransaction
        ); 

module.exports = router;