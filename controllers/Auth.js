const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken")
require("dotenv").config()
//signup 

exports.signup = async(req,res) => {
    try{
       //fetch data
       const {name,email,password} = req.body;
       //check if user alredy exist
       
       //find existing user from database
       const existingUser = await User.findOne({email});

       // if present
       if(existingUser){  
        return res.status(400).json({
            success:false,
            message:"user alredy exist"
        })
       }
        
       //secure password
       let hashedPassword;
       try{
         hashedPassword = await bcrypt.hash(password,10);
       }
       catch(err){
        res.status(500).json({
            success:false,
            message:"error in hashing password",
        })
       }

       //crete user
       const user = await User.create({name,email,password:hashedPassword,role})
       return res.status(200).json({
        success:true,
        message:"user created successfully"
       })
    }
    catch(error){
        console.error(error);
        return res.status(500).json({
            success:false,
            message:"error in creating user",
        })
    }
}




//login 

exports.login = async(req,res)=>{

    try{
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({
                success: false,
                message:"please enter email or password",
            })
        }
        let response = await User.findOne({email:email});
        if(!response){
            return res.status(404).json({
                success: false,
                message:"user does not exist please sign up"
            })
        }
        
        //verify password & genrate a JW token
        const payload = {
            email: response.email,
            id:response._id,
            role:response.role
        }
        const isMatch =await bcrypt.compare(password,response.password);
        if(!isMatch){
            return res.status(401).json({
                success:false,
                message:"please enter correct password"
            })
        }
        else{
            //password match
            let token = jwt.sign(payload,
                process.env.JWT_SECRET,
                {
                    expiresIn:"2h",
                }
            );
            response = response.toObject();
            response.token = token;
            response.password = undefined;
            const options = {
                expired:new Date(Date.now()+3*24*60*60*1000*1000*1000*60),
                httpOnly:true,
            }
            res.cookie("token",token, options).status(200).json({
                success:true,
                token,
                response,
                message:"logged in successfully"
            })
        }
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            success: false,
            error:err,
            message:"internal server error"
        })
    }
}

