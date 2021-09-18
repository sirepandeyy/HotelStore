var Hotel = require("../models/hotels");
var Comment = require("../models/comments");
var User = require("../models/user");
const user = require("../models/user");

var middlewareObj = {}


middlewareObj.isNotVerified = async function(req,res,next){
    try{
        const user = await User.findOne({username:req.body.username});
    if(user.isVerified){
        return next()
    }
    req.flash('error',"Your account has not been verified. Please check your mail to verify")
    return res.redirect("/");
    }
    catch{
        console.log(err) 
        req.flash('error','Something went wrong , contact us for assistance');
        res.redirect("/")      
    }
}