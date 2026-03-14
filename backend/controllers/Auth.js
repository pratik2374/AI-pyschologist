const User = require("../models/User");
const OTP = require("../models/otp");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const otpGenerator =require("otp-generator");
const { sendmail } = require("../utils/mailsender");

require("dotenv").config();

//generate otp
exports.generateOTP = async (req, res) => {
    try{
        console.log("otp started");

        const {email} = req.body;

        //validation
        if(!email){
            return res.status(401).json({
                success: false,
                message: "Enter the email address"
            })
        }

        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        })

        const created = await OTP.create({
          otp: otp,
          email: email,
        });

        try {
          await sendmail(email, `OTP for Sign Up`, `${otp}`);
        } catch (mailErr) {
          // cleanup OTP if email failed
          try {
            await OTP.deleteOne({ _id: created?._id });
          } catch {}

          return res.status(500).json({
            success: false,
            message:
              "Unable to send OTP email right now. Please try again later.",
          });
        }

        res.status(200).json({
            success:true,
            message:"OTP sent successfully"
        })
    } catch(err){
        res.status(500).json({
            success: false,
            message:"Error occured while generating otp"
        })
    }
}


//Signup
exports.signup = async (req, res) =>{
    try{
        const {name, email,password, role, otp} = req.body;

        //validation
        if(!name || !email || !password ||!role || !otp){
            return res.status(401).json({
                success: false,
                message:"Enter all the required fields"
            })
        }

        //find otp
        const actualOTP = await OTP.find({email}).sort({created:-1}).limit(1);

        if(!actualOTP[0].otp){
            return res.status(401).json({
                success: false,
                message:"No otp found for this email"
            })
        }
        console.log(actualOTP[0].otp,parseInt(otp));
        if(actualOTP[0].otp !== parseInt(otp)){
            return res.status(401).json({
                success: false,
                message:"Wrong OTP"
            })
        }

        //hash password
        const hashedpassword = await bcrypt.hash(password, 10);

        //create user
        const response = await User.create({
            name:name, 
            email:email,
            password: hashedpassword,
            role:role});

        response.password = undefined;

        //Create token and log in the user 
        const payload={
            role: response.role,
            userid: response._id,
            email: email
        }

        const token = jwt.sign(payload, process.env.SECRET_KEY, {
            expiresIn:"10h"
        })

        res.status(200).cookie("token", token, 
            {
                expires: new Date(Date.now() + 24*60*60*1000),
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            }
        ).json({
            success: true,
            message:"User Created Successfully ",
            response
        })
    } catch(err){
        res.status(500).json({
            success: false,
            message:"Some internal error occured while registering"
        })
    }
}


//Login
exports.login = async (req, res) =>{
    try{
        const {email, password} = req.body;

        //validation 
        if(!email || !password){
            return res.status(401).json({
                success: false,
                message:"Enter all the fields"
            })
        }

        const user = await User.findOne({email:email});
        
        if(!user){
            return res.status (401).json({
                success: false,
                message:"User doesn't exists"
            })
        }

        

        const result = await bcrypt.compare(password, user.password);

        if(!result){
            return res.status(401).json({
                success:false,
                message:"Wrong Password"
            })
        }

        const payload={
            role: user.role,
            userid: user._id,
            email: email
        }

        const token = jwt.sign(payload, process.env.SECRET_KEY, {
            expiresIn:"2h"
        })
        const response = user;

        res.status(200).cookie("token", token, 
            {
                expires: new Date(Date.now() + 60*60*1000),
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            }
        ).json({
            success: true,
            message:"User Logged In successfully",
            response
        })
    } catch(err){
        res.status(500).json({
            success:false,
            message:"Internal error occured while Logging in"
        })
    }
}