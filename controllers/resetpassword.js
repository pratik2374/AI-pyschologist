const User = require("../models/User");

const {sendmail} = require("../utils/mailsender");
const bcrypt = require("bcrypt")


//reset Password Link
exports.resetPasswordLink = async (req, res) =>{
    try{
        const {email} = req.body;

        if(!email){
            return res.status(401).json({
                success: false,
                message:"No email entered"
            })
        }
        
        const user = await User.findOne({email: email});

        if(!user){
            return res.status(401).json({
                success: false,
                message:"user doesn't exists"
            })
        }
        
        const token = crypto.randomUUID();

        const url = `localhost:3000/resetpassword/${token}`;

        // 10 minutes
        const expiryTime = Date.now() + 10 * 60 *1000;

        // make changes in user
        await user.updateOne({
            resetPasswordToken: token,
            resetPasswordExpiry: expiryTime
        }, {new: true});


        // send email
        const respone = await sendmail(email, "Reset Password Link", `${url}`);

        res.status(200).json({
            success: true,
            message:"Link sent successfully"
        })
    } catch(err){
        res.status(500).json({
            success: false,
            message:"Internal error in link generation "+err
        })
    }
}


//reset password
exports.resetPassword = async (req, res) =>{
    try{
        const token = req.params.token;

        const {newPassword, confirmPassword} =req.body;

        if(!newPassword || !confirmPassword){
            return res.status(401).json({
                success: false,
                message:"Enter all the required fields"
            })
        }

        if(newPassword !== confirmPassword){
            return res.status(401).json({
                success: false,
                message:"Passwords doesn't match"
            })
        }

        const user = await User.findOne({resetPasswordToken: token});

        if(!user){
            return res.status(401).json({
                success: false,
                message:"Invalid token"
            })
        }

        if(user.resetPasswordExpiry < Date.now()){

            await user.updateOne({$unset:{
                resetPasswordToken:"",
                resetPasswordExpiry:""
            }});

            return res.status(401).json({
                success: false,
                message:"Token expired "
            })
        }

        let hashedpassword = await bcrypt.hash(newPassword, 10);

        const response= await user.updateOne({
            $set:{password:hashedpassword},
            $unset:{
                resetPasswordExpiry:"",
                resetPasswordToken:""
            }},
            {new:true});

        res.status(200).json({
            success: true,
            message:"Password Reset Successfull"
        })
    } catch(err){
        res.status(500).json({
            success: false,
            message:"Internal error in reseting password "+err
        })
    }
}