
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

// get all messages for a session
exports.chatBySession = async (req, res) => {
  try {
    const user_id = req.decoded?.userid;
    const { sessionId } = req.params;
    const chats = await Chat.find({ user_id, session_id: sessionId }).sort({
      createdAt: 1,
    });
    res.status(200).json({
      success: true,
      message: "Session chat retrieved",
      response: chats,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching session chat",
      err,
    });
  }
};

exports.currChat = async (req, res) => {
  try {
    const user_id = req.decoded?.userid;
    const { query, sessionId } = req.body;
    const api = process.env.currentChatdjangoApi;

    if (!api) {
      throw new Error("currentChatdjangoApi is not configured in environment");
    }

    const response = await fetch(api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id,
        query,
        sessionId,
      }),
    });

    const data = await response.json();

    // Normalize assistant response text for logging
    let agentText = "";
    if (typeof data === "string") {
      agentText = data;
    } else if (typeof data?.response === "string") {
      agentText = data.response;
    } else if (typeof data?.message === "string") {
      agentText = data.message;
    } else {
      agentText =
        "I'm here with you. Could you tell me a bit more about how you're feeling right now?";
    }

    // Persist conversation log so it appears in past chats
    try {
      const allowedModes = ["cbt", "humanistic", "psychoanalytic", "none"];
      const incomingModeRaw = data?.therapy_mode;
      const incomingMode =
        typeof incomingModeRaw === "string"
          ? incomingModeRaw.toLowerCase()
          : undefined;
      const safeMode = allowedModes.includes(incomingMode)
        ? incomingMode
        : "none";

      await Chat.create({
        user_id: String(user_id),
        session_id: sessionId,
        user_message: query,
        agent_response: agentText,
        tags: Array.isArray(data?.tags) ? data.tags : [],
        crisis_detected: Boolean(data?.crisis_detected),
        therapy_mode: safeMode,
      });
    } catch (logErr) {
      console.error("Error saving chat log", logErr);
      // Don't fail the request for logging issues
    }

    return res.status(200).json({
      success: true,
      message: "curr chat api working good",
      data,
    });
  } catch (err) {
    console.error("currChat error:", err);
    return res.status(500).json({
      success: false,
      message:
        "Error occured while current chat: " +
        (err && err.message ? err.message : "Unknown error"),
      err: err && err.stack ? err.stack : err,
    });
  }
};
