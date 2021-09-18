var mongoose              = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var userSchema = new mongoose.Schema({
    username:String,
    password:String,
    avatar:String,
    firstName:String,
    lastName:String,
    isAdmin:{type:Boolean,default:false},
    email:String,
    emailToken:String,
    isVerified:Boolean,
    isPaid:{type:Boolean,default:false},
    booked: [{

        _id: String,
        rooms: Number
    }
    ]
})

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User" , userSchema);
