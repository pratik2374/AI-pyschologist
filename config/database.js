const mongoose = require("mongoose");

require("dotenv").config();

exports.connect = () => {
    mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("DB connected");
    })
    .catch((err) => {
        // Log the error type/message only — never the full error object,
        // which could contain the connection string with credentials.
        console.error("DB connection failed:", err.message);
        process.exit(1);
    });
};
