const express = require("express");
const route = express.Router();

const {AuthN, isVisitor, isAdmin} = require("../middlewares/auth");
const {pastHistory,currChat} = require("../controllers/ChatBotIntraction")
//Auth
const {generateOTP, signup, login} = require("../controllers/Auth");
route.post("/generateotp", generateOTP);
route.post("/signup", signup);
route.post("/login", login);
route.get("/pastChat/:id",pastHistory);
route.post("/currChat",currChat);


module.exports = route;
