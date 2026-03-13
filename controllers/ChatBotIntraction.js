
const User = require('../models/User');
const Chat = require('../models/Chat');
require("dotenv").config();

exports.pastHistory = async(req,res)=>{
    try{
        const user_id = req.decoded?.userid;
        const response = await Chat.find({user_id});

        res.status(200).json({
            success:true,
            message:"response recieved of past chats",
            response
        })

    }
    catch(err){
        res.status(500).json({
            success: false,
            message:"Error occured while fetching past chat",
            err
        })
    }
}


//current logs

exports.currChat = async(req,res)=>{
    try{      
        const user_id = req.decoded?.userid;
        const {query,sessionId} = req.body;
        const api = process.env.currentChatdjangoApi;

        const response = await fetch(api, {
          method: "POST",
          headers: {
           "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id,   
            query,
            sessionId
          })
        });
        const data = await response.json();

        return res.status(200).json({
            success:true,
            message:"curr chat api working good",
            data
        })
        
    }
    catch(err){
        res.status(500).json({
            success: false,
            message:"Error occured while current chat",
            err
        })
    }
}
