const express = require("express");
const route = express.Router();

const { AuthN, isVisitor, isAdmin } = require("../middlewares/auth");
const {
  pastHistory,
  currChat,
  chatBySession,
} = require("../controllers/ChatBotIntraction");
const { generateSessionId } = require("../controllers/generateSession");
const { generateOTP, signup, login } = require("../controllers/Auth");
const {
  resetPasswordLink,
  resetPassword,
} = require("../controllers/resetpassword");

// Auth (public)
route.post("/generateotp", generateOTP);
route.post("/signup", signup);
route.post("/login", login);
route.post("/resetPasswordLink", resetPasswordLink);
route.post("/resetPassword/:token", resetPassword);

// Protected (AuthN + isVisitor)
route.get("/pastChat", AuthN, isVisitor, pastHistory);
route.get("/chatSession/:sessionId", AuthN, isVisitor, chatBySession);
route.post("/currChat", AuthN, isVisitor, currChat);
route.get("/generateSessionId", AuthN, isVisitor, generateSessionId);

module.exports = route;