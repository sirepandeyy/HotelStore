var mongoose = require("mongoose");

const opts = { toJSON: { virtuals: true } };

var hotelSchema = new mongoose.Schema({
    
   
    name:String,
    image:[
        {
            url:String,
            filename:String
        }
    ],

  
    geometry: {
        type: {
          type: String, // Don't do `{ location: { type: String } }`
          enum: ['Point'], // 'location.type' must be 'Point'
          required: true,
          default:'Point'
        },
        coordinates: {
          type: [Number],
          required: true
        }
      },
    description:String,
    location:String,
    price:String,
    created: {type:Date , default:Date.now},
    reviews:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Review"
        }
    ],
    author:{
        id: {
 
             type:mongoose.Schema.Types.ObjectId,
             ref:"User"
         },
         username:String
     },
	comments:[
        {
        author:{
            id: {
 
                type:mongoose.Schema.Types.ObjectId,
                ref:"User"
            }, 
        },
        type:mongoose.Schema.Types.ObjectId,
        ref:"Comment" 
        }
    ],
    
    Notbooked: [
    ],
    booked: [
    ]

},opts)


hotelSchema.virtual('properties.PopupMarkup').get(function () {
    return `
    <strong><a href="/hotels/${this._id}">${this.name}</a><strong>
    <p>${this.description.substring(0, 20)}...</p>`
});


var Hotel = mongoose.model("Hotel" , hotelSchema)

module.exports = Hotel;