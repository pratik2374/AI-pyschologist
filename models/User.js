const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        trim:true
    },

    age:{
        type : Number,
        required:true,
        trim:true
    },

    city:{
        type : String,
        trim:true
    },

    email:{
        type: String,
        required:true,
        trim:true
    },

    password:{
        type:String,
        required: true
    },


    role:{
        type:String, 
        required: true,
        enum:["Admin","Visitor"],
        default:"Visitor"
    },

    resetPasswordToken:{
        type:String
    },

    resetPasswordExpiry:{
        type: Date
    }
})

userSchema.index({role:1});

module.exports= mongoose.model("User",userSchema);