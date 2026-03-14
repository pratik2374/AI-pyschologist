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

module.exports = mongoose.model("OTP", otpSchema);