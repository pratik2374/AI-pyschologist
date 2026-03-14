const mongoose = require("mongoose");

require("dotenv").config();

exports.connect = () =>{
    mongoose.connect(process.env.MONGODB_URL,{
        useNewUrlParser:true,
        useUnifiedTopology:true
    })
    .then(()=>{console.log("DB connected");})
    .catch((err)=>{
        console.log("Db connection issue")
        console.error(err);
        process.exit(1);
    })
}