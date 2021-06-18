const axios = require("axios");
const catchAsync = require('../utils/catchAsync');

//@desc   processing payment with paystack api
exports.debitPaystack = catchAsync(async (accountNumber, bankName, amount) => {
    const config = {
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
    };

    let banks = await axios.get(
        'https://api.paystack.co/bank',
        config
    );

    let bankRes = banks.data.data
    
    bankDetails = bankRes.find((bank) => bank.name === bankName);
      

    const res = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankDetails.code}`,
        config
    );

    const data = res.data.data;

    console.log(data)

    const recipient = await axios.post(
        "https://api.paystack.co/transferrecipient",
        {
            account_number: data.account_number,
            type: "nuban",
            name: data.account_name,
            bank_code: bankDetails.code,
            currency: "NGN",
        },
        config
    );

    const data2 = recipient.data.data;

    const transfer = await axios.post(
        "https://api.paystack.co/transfer",
        {
            source: "balance",
            amount: amount * 100,
            recipient: data2.recipient_code,
            domain: "test",
            reason: "debit my Ewallet"
        },
        config
    );

    let transferRes = transfer.data.data;

    return transferRes;
});


//@desc   processing payment with paystack api
exports.creditPaystack = catchAsync(async (userAccDetails) => {
    const config = {
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
    };

    let banks = await axios.get(
        'https://api.paystack.co/bank',
        config
    );

    let bankRes = banks.data.data
    
    
    bankDetails = bankRes.find((bank) => bank.name === userAccDetails.bankName);

    const res = await axios.post(
        `https://api.paystack.co/charge`,
        {
            email: userAccDetails.email,
            amount: userAccDetails.amount * 100, 
            bank: {
                    code: bankDetails.code, 
                    account_number : userAccDetails.accountNumber 
            },
            birthday: userAccDetails.birthday
        },
        config
        
    );

    const data = res.data;

    return data 
});