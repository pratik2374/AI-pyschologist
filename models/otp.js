const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    otp:{
        type: Number,
        required: true
    },

    email:{
        type: String,
        required: true
    },

    //date created and expiry
    created:{
        type:Date,
        default: Date.now(),
        expires: 10*60
    }
});

const {sendmail} =require("../utils/mailsender");

otpSchema.pre('save', async function (next){
    const email = this.email;
    const otp = this.otp;

    try{
        await sendmail(email, `OTP for Sign Up`, `${otp}`);

        next();

    } catch(err){
        console.log("Some error occured while sending otp in pre middleware ", err)
    }
})

module.exports = mongoose.model("OTP", otpSchema);