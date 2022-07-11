import 'dotenv/config'
import bodyParser from "body-parser";
import express from "express";
import mongoose from "mongoose";
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from 'passport-local-mongoose'
import findOrCreate from 'mongoose-findorcreate'
import GoogleStrategy from 'passport-google-oauth20';
import cookieParser from 'cookie-parser';

const app = express();

app.use(express.static("public"));
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(session({
  secret: 'My top secret',
  resave: false,
  saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());


//google auth2.0 
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},

(accessToken, refreshToken, profile, cb) => {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


mongoose.connect(
  "mongodb+srv://jdawan:SXsximWXl3bQ8EXY@cluster0.j4htk.mongodb.net/?retryWrites=true&w=majority"
);

const userSchema =  new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});




///////////////////////////////////////////////////////////ROUTES///////////////////////////////////////////////////////////////
app.get("/", (req, res) => {
  res.render("home");
});


app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });


app.get("/secrets",(req,res)=>{
  User.find({"secret": {$ne: null}},(err,foundUsers)=>{
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render('secrets',{usersWithSecrets: foundUsers})
      }
    }
  })
})

app.route("/submit")
.get((req,res)=>{
  if(req.isAuthenticated) {
    res.render('submit');
  }
  else{
    res.redirect('login')
  }
})
.post((req,res)=>{
  const secret = req.body.secret;
  User.findById(req.user._id, (err,foundUser)=>{
    if (err) {
      console.log(err);
    }
    else{
      if (foundUser) {
        foundUser.secret = secret;
        foundUser.save();
        res.redirect("/secrets");
      }
    }

  });

});


app.route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const user = new User({
      username:req.body.username,
      password:req.body.password
    })

    req.login(user,(err)=>{
      if (err) {
        console.log(err);

      } else {
        passport.authenticate("local")(req, res, ()=>{
          res.redirect("/secrets");
        })
      }

    })
  });

app.get('/logout',(req,res)=>{
  req.logout((err)=>{
    if (err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });
})


app.route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    User.register({username: req.body.username}, req.body.password, (err,user)=> {
      if (err) {
        console.log(err);
        res.redirect('/register'); 
      }
      else{
        passport.authenticate('local')(req,res, ()=>{
          res.redirect('/secrets')
        })
      }

    })
  });


app.listen(3000, () => {
  console.log("Server started on port 3000");
});
