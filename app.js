if(process.env.NODE_ENV !== "production"){
    require('dotenv').config()
}
const  stripePublickey= process.env.Stripe_public_key;

var express = require("express"),
    app = express(),
    session = require("express-session"),
    passport = require("passport"),
    body = require("body-parser"),
    methodOverride = require("method-override"),
    LocalStrategy = require("passport-local"),
    GoogleStrategy = require("passport-google-oauth").OAuth2Strategy,
    Hotel = require("./models/hotels"),
    User = require("./models/user"),
    Review = require("./models/reviews"),
    fs = require("fs"),
    validator = require("aadhaar-validator"),
    Comment = require("./models/comments"),
    Customer = require("./models/customer"),
    cookieSession = require('cookie-session'),
    findOrCreate = require("mongoose-findorcreate"),
    flash = require("connect-flash"),   
    multer = require('multer'),
    {storage} = require("./cloudinary"),  
    upload = multer({storage}),
    stripe  = require("stripe")(stripePublickey),
    sgMail = require("@sendgrid/mail"),
    expressSanitizer = require("express-sanitizer"),
    crypto = require("crypto"),
    mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding"),
    mapboxToken = process.env.mapbox_public_key,
    geocoder = mbxGeocoding({accessToken:mapboxToken}); 

 sgMail.setApiKey(process.env.sendGrid_api_key);
app.use(express.static("public"));
app.set("view engine" , "ejs");
app.use(methodOverride("_method"));

const dbURL = process.env.dbURL || 'mongodb://localhost/Banaras_Project';
const mongoose = require('mongoose');

mongoose.connect(dbURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
})
.then(() => console.log('Connected to DB!'))
.catch(error => console.log(error.message));


var j; 
const MongoStore = require('connect-mongo')(session);

app.use(session({
	secret:"The name is bond",
    store: new MongoStore({
        url:dbURL,
        secret:'thenameisbondjamesbond',
        touchAfter:24*60*60
    }),
    resave:false,
	saveUninitialized:false
}))

app.use(express.json())
app.use( body.urlencoded({extended:true}));
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())


var j;
app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    if (req.user!= undefined){
        j = req.user._id;
    }
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
	next();
})


app.use(expressSanitizer());
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())


passport.serializeUser(function(user,done){
done(null,user.id)
})
passport.deserializeUser(function(id,done){
User.findById(id,function(err,user){
    done(err,user)
})
})





app.get('/auth/google',
  passport.authenticate('google', { scope:['profile','email'] }));

//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res ,next){
    res.redirect('/');
  });


  passport.use(new GoogleStrategy({
    clientID: '69066812416-44u9s1o8qs4bl1llrpq08nlvtrj6qfip.apps.googleusercontent.com',
    clientSecret: '86Y7OjNcKDtSJr1L11zIXxr7',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
       User.findOrCreate({ googleId: profile.id }, function (err, user) {
         return done(err, user);
       });
  }
));


/*app.post("/payment",function(req,res){
    console.log(req.body)
    req.user.isPaid = true;
    req.user.save()
      
    res.send("payment")
})*/






app.get("/" , function(req,res){

    res.render("booking")
})


/*
Hotel.create({
}, function(err,hotel){
    if(err){
        console.log(err)
    }else{
        console.log(hotel)
    }
});*/

app.get("/hotels/newHotel", isLoggedIn ,function(req,res){
    res.render("new")
})

app.post("/hotels" , isLoggedIn,upload.array('image'),async (req, res,next)=>{

              Hotel.create(req.body.hotel,async(err, hotels)=>{
                if (err) {
                    req.flash('error', err.message);
                    return res.redirect('back');
                }
                for(let r = 1;r <= 10;r++){
                    hotels.Notbooked.push(r);
                }
                    hotels.booked = [];                
                var geoData = await geocoder.forwardGeocode({
                    query: hotels.location,
                    limit: 1
                  }).send()
                  hotels.geometry = geoData.body.features[0].geometry;
                hotels.image = req.files.map( f=> ({ url:f.path ,filename:f.filename }));
                hotels.author.id = req.user.id;
                hotels.author.username = req.user.username;
                hotels.save();              
                res.redirect('/hotels');
            });
    
})


app.get("/hotels" , function(req,res){
    var noMatch=null;
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Hotel.find({name:regex} , function(err , allHotels){
            if(err){
                console.log(err)
            } else{
     
                
           if(allHotels.length<1){
               noMatch = "No Hotel found , please try again";
           }
        
                res.render("Hotels" , { hotel:allHotels , currentUser:req.user ,noMatch:noMatch})
            }
         })

    }else{
    Hotel.find({} , function(err , allHotels){
       if(err){
           console.log(err)
       } else{

           res.render("Hotels" , { hotel:allHotels , currentUser:req.user ,noMatch:noMatch})
       }
    })
}
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};



app.get("/hotels/:id", isLoggedIn, upload.array('image'),function(req,res){

    
    Hotel.findById(req.params.id).populate("comments").populate("reviews").exec(function(err,foundhotel){
        if(err){
            console.log(err)
        }else{
            foundhotel.reviews.author = req.user
            foundhotel.price =  foundhotel.price
            console.log(foundhotel.reviews.author._id)
            foundhotel.comments.map(f=>({author:req.user}))
            res.render("bookingpage" , { Hotel : foundhotel,stripePublickey:stripePublickey })
        
        }
    })

    

})










app.get("/hotels/:id/edit" , checkHotelOwnership ,function(req,res){
	
    Hotel.findById(req.params.id , function(err,foundHotel){
        if(err){
            res.redirect("/hotels")
        }else{
                res.render("hotel/edit" , {Hotel:foundHotel})

        }
    })
})

//Update  Route
app.put("/hotels/:id",checkHotelOwnership, upload.array('image')  ,function(req,res){
Hotel.findByIdAndUpdate(req.params.id,req.body.hotel,function(err,updateHotel){
    if(err){
        console.log(err)
        res.redirect("/hotels")
    }else{

        const img = req.files.map( f=> ({ url:f.path ,filename:f.filename }));
        updateHotel.image.push(...img);
        updateHotel.save()       
        res.redirect("/hotels/"+req.params.id);

    }
})


})

app.delete("/hotels/:id" ,checkHotelOwnership , function(req,res){

Hotel.findByIdAndRemove(req.params.id , function(err,foundHotel){
    if(err){
        console.log(err)
    }else{
        res.redirect("/hotels");
    }
})

})







let n;
let data;
app.get("/receipt",(req,res)=>{
    let t = Object.assign(n,data);
    res.render("receipt",{t})
})

app.post('/hotels/:id/payment', function(req, res){ 
    const { id } = req.params;
    const  roomdata  = req.body;
    data = roomdata;
    const room = roomdata.Rooms;
    const amount = req.body.price;
    User.findById(j, (err,hotel)=>{
        hotel.booked.push({_id:id,rooms:room});
        hotel.save();
    })
    
    
    Hotel.findById( id , (err,hotels)=>{
        n = hotels;
        const index = hotels.Notbooked.indexOf(room);
        hotels.Notbooked.splice(index,1);
        hotels.booked.push(Number(room));
        hotels.save();
    })

  
    try {
      // Create new PaymentIntent with a PaymentMethod ID from the client.
      const intent = stripe.paymentIntents.create({
        amount,
        //currency,
        payment_method: "card",
        error_on_requires_action: true,
        confirm: true
      });

      
  
      console.log("💰 Payment received!");

      req.user.isPaid = true;
      req.user.save(); 
      res.redirect("/receipt");
    } catch (e) {
      // Handle "hard declines" e.g. insufficient funds, expired card, card authentication etc
      // See https://stripe.com/docs/declines/codes for more
      if (e.code === "authentication_required") {
        res.send({
          error:
            "This card requires authentication in order to proceeded. Please use a different card."
        });
      } else {
        res.send({ error: e.message });
      }
    }
});










app.post("/hotels/:id/reviews",function(req,res){
    
    Hotel.findById(req.params.id , function(err,hotel){
        if(err){
            console.log(err)
        }else{
            const review = new Review(req.body.review)
            review.author.username = req.user.username;
            hotel.reviews.push(review)
           
            review.save()
            hotel.save()
            res.redirect("/hotels/"+req.params.id);
        }
    }) 
})



app.delete("/hotels/:id/reviews/:reviews_id",function(req,res){
    Review.findByIdAndRemove(req.params.reviews_id , function(err,review){
        if(err){
            console.log(err)
        }else{
            res.redirect("/hotels/"+req.params.id)
        }
    })
})












app.get("/hotels/:id/comments/new", isLoggedIn ,function(req,res){

    Hotel.findById(req.params.id , function(err,hotel){
    res.render("comments/new" , {hotel:hotel});
    })
})

app.post("/hotels/:id/comments", isLoggedIn ,function(req,res){

    Hotel.findById(req.params.id , function(err,hotel){
        if(err){
            console.log((err))
            res.redirect("/hotels")
        }else{
            Comment.create(req.body.comment , function(err,comment){
                if(err){
                    console.log(err)
                    res.redirect("/hotels")
                }else{
                    comment.author.id = req.user.id;
                    comment.author.username = req.user.username;
                    comment.save()
                    hotel.comments.push(comment)
                    hotel.save()
                    req.flash("success","Successfully added comment")
                    res.redirect("/hotels/"+hotel._id)
        
                }
            })


        }
    })

})

app.get("/hotels/:id/comments/:comment_id/edit" , checkOwnership ,function(req,res){
  
    Comment.findById(req.params.comment_id , function(err,foundComment){
        if(err){
            console.log(err)
        }else{
               res.render("comments/edit" , {Hotel_id:req.params.id , comment:foundComment})
        }
    })

})

app.put("/hotels/:id/comments/:comment_id" ,checkOwnership ,function(req,res){


    Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,updateComment){
        if(err){
            console.log(err)
        }else{
            res.redirect("/hotels/"+req.params.id)
        }
    })

})

app.delete("/hotels/:id/comments/:comment_id" , checkOwnership ,function(req,res){

    Comment.findByIdAndRemove(req.params.comment_id,function(err,removeComment){
        if(err){
            console.log(err)
        }else{
            req.flash("success","Succcessfully deleted comment")
            res.redirect("/hotels/"+req.params.id)
        }
    })


})


app.get("/team" , function(req,res){
    
    res.render("team")
})



app.get("/register" ,async function(req,res){
     
    res.render("register",{error:req.flash("error")})
})
app.post("/register",async function(req,res){
   
    var newUser = new User({
        username:req.body.username,
        email:req.body.email,
        emailToken:crypto.randomBytes(64).toString('hex'),
        isVerified:false,
        
    });
    if(req.body.adminCode == 'secretcode123'){
        newUser.isAdmin = true;
    }
	User.register(newUser ,req.body.password ,async function(err,user){
		if(err){
			req.flash("error",err.message)
			return res.render("register")
        }
        const msg = {
            to:user.email,
            from: "aman.pandey_cs18@gla.ac.in",
            subject:'HotelStore - Verify your email',
            text:`Hello Thanks for registering on our website,copy and paste the address below to verify email http://${req.headers.host}/verify-email?token=${user.emailToken}`,
            html:`<h1>Hello there verify your account</h1>
            <p>Thanks for registering on our website</p>
            <p>Please click the link below to verify your account.</p>
            <a href="http://${req.headers.host}/verify-email?token=${user.emailToken}" >Verify your account</a>
            `
        }
        try{
            await sgMail.send(msg);
            req.flash("success","Thanks for registering . Please check your email to verify your account");
            res.redirect("/");
        }
        catch(error){
            console.log(error);
            req.flash('error',"Something went wrong.Please contact us for assistance");
            console.log(user)
            res.redirect("/")
        }

	})

})

app.get("/verify-email",async(req,res,next)=>{
    try{
        const user = await User.findOne( {emailToken:req.query.token} );
    if(!user){
        req.flash('error','Token is Invalid . Please contact us for assistence')
        console.log(emailToken)
        return res.redirect("/");
    }    
    user.emailToken = null;
    user.isVerified = true;
    await user.save();
    await req.login(user , async (err)=>{
        if(err) return next(err)
        req.flash('success',`Welcome to HotelStore ${user.username}`);
        const redirectUrl = req.session.redirectTo || '/' ;
        delete req.session.redirectTo;
        res.redirect(redirectUrl);
    })
    }catch(error){
        req.flash('error',"something went wrong");
        res.redirect("/")
    }
})



app.get("/login", function(req,res){
    
    req.flash("error","You need to be LoggedIn to that ")

	res.render("login" , {error:req.flash("error")}); 
})

async function isNotVerified(req,res,next){
    try{
        const user = await User.findOne({username:req.body.username});
    if(user.isVerified){
        return next()
    }
    req.flash('error',"Your account has not been verified. Please check your mail to verify")
    return res.redirect("/");
    }
    catch(error){
        console.log(err) 
        req.flash('error','Something went wrong , contact us for assistance');
        res.redirect("/")      
    }
}


app.post("/login"  , isNotVerified , passport.authenticate("local" , {
    
    successRedirect:("/"),
	failureRedirect:"/login"

})  , function(req,res){

})


function isLoggedIn(req,res,next){

	if(req.isAuthenticated()){
		return next()
	}
        req.flash("error","You need to be LoggedIn")

		res.redirect("/login");
}


function checkHotelOwnership(req,res,next){


	if(req.isAuthenticated())
	{
		Hotel.findById(req.params.id , function(err,foundHotel){
			if(err){
				res.render("back")
			}else{
				
				if( foundHotel.author.id.equals(req.user._id) || req.user.isAdmin){
					next()
				}else{
					res.redirect("/hotels/"+req.params.id);
				}
			}
		})

	
	}else{

	console.log("need to be logged In")		
	res.send("need login In")

	}	

}


app.get("/contact",function(req,res){
    res.render("contact")
})

app.post("/contact", async (req,res)=>{
    let {name ,email,message } = req.body;
    name = req.sanitize(name);
    email = req.sanitize(email);
    message = req.sanitize(message);
    const msg = {
        to: 'amankpandeyvns@gmail.com',
        from: req.body.email, // Use the email address or domain you verified above
        subject: `HotelStore Form submission From${name}`,
        text: message,
        html: message,
      };
      try {
        await sgMail.send(msg);
        req.flash('success','Thank You for your email')
        res.redirect("/contact")
      } catch (error) {
        console.error(error);
     
        if (error.response) {
          console.error(error.response.body)
        }
    req.flash('error','Sorry Something is wrong')  
    res.redirect("/hotels")
    console.log(msg.to)
    console.log(req.body.email)
    }
    });



function checkOwnership(req,res,next){
    
	if(req.isAuthenticated())
	{
		Comment.findById(req.params.comment_id , function(err,foundComment){
			if(err){
                req.flash("error","Campground not found")
				res.redirect("back")
			}else{
				
				if( foundComment.author.id.equals(req.user._id)){
					next()
				}else{
                    req.flash("error","You do not have permission to do that")
					res.redirect("/back")
				}
			}
		})

	
	}else{

	req.flash("error","You need to be LoggedIn to do that")	
	res.send("need login In")

	}	

}


app.get("/logout",function(req,res){
    req.logout();
    req.flash("success" , "You Logged Out successfully ");
	res.redirect("/");
})









const port = process.env.PORT || 3000

app.listen(port , function(req,res){
    console.log(`Banaras is running!! on ${port}`)
})