const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");

require("./config/database").connect();

require("dotenv").config();
const PORT = process.env.PORT || 4000;

// middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


//routes import and mount
const routes = require("./routes/route");

app.use("/api/v1",routes);

app.listen(PORT,()=>{
    console.log("app running successfully");
})
