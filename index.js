const express = require("express");
const app = express();

require('dotenv').config();
const PORT = process.env.PORT || 4000;

const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(express.json());

require("./config/database").connect();

//routes import and mount
const user = require("./routes/route");

app.use("/api/v1",user);

app.listen(PORT,()=>{
    console.log("app running successfully");
})
