const express = require("express");
const route = express.Router();

const {AuthN, isVisitor, isAdmin} = require("../middlewares/auth");

//Auth
const {generateOTP, signup, login} = require("../controllers/Auth");
route.post("/generateotp", generateOTP);
route.post("/signup", signup);
route.post("/login", login);


module.exports = route;
