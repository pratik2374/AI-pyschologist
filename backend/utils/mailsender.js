const nodemailer = require("nodemailer");

require("dotenv").config();

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    
    auth:{
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASS
    }
});

exports.sendmail = async (email, title, body) =>{
    try{
        const result = await transporter.sendMail({
            from:`"Sourabh" ${process.env.USER_EMAIL}`,
            to:`${email}`,
            subject: title,
            text: body
        })

        console.log("Mail sent successfully !");

    } catch(err){
        console.log("Some error occured while sending mail " + err);
    }
}