const User = require('../models/User');

exports.generateSessionId = async(req,res)=>{
    try{
        const user_id = req.decoded?.userid;
        const sessionId = user_id + "-" + Date.now();
         return res.status(200).json({
            success:true,
            message:"session Id generated",
            sessionId
        })
    }
    catch(err){
        res.status(500).json({
            success: false,
            message:"Error while generating session Id",
            err
        })
    }
}