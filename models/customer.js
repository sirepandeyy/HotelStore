const mongoose = require("mongoose")
const customerSchema = new mongoose.Schema({
    
    FirstName:String,
    LastName:String,
    Email:String,
    PhoneNumber:Number,
    Id:String,
    Idno:Number,
    Rooms:Number,
    CheckIn:Date,
    CheckOut:Date

})

module.exports = mongoose.model("Customer" , customerSchema )