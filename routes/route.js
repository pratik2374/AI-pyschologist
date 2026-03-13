const express = require("express");
const route = express.Router();

const {AuthN, isVisitor, isAdmin} = require("../middlewares/auth");
const {pastHistory,currChat} = require("../controllers/ChatBotIntraction");

const {generateSessionId} = require("../controllers/generateSession");
//Auth
const {generateOTP, signup, login} = require("../controllers/Auth");
route.post("/generateotp", generateOTP);
route.post("/signup", signup);
route.post("/login", login);
route.get("/pastChat",AuthN,isVisitor,pastHistory);
route.post("/currChat",AuthN,isVisitor,currChat);

route.get("/generateSessionId",AuthN,isVisitor,generateSessionId);


module.exports = route;