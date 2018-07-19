var express = require("express");
var path = require("path");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser"); // We will use this to parse the HTTP request body so that we can retrieve data to post to the database
var cors = require("cors");
var passportSetup = require("./config/passport-setup");
var session = require("express-session");
const passport = require("./passport");
const dbConnection = require("./db");
const MongoStore = require("connect-mongo")(session);
var app = express();

// app.use(
//   session({
//     secret: "hokage" || "this is the default passphrase",
//     store: new MongoStore({ mongooseConnection: dbConnection }),
//     resave: false,
//     saveUninitialized: false
//   })
// );

//-----------Passport Stuff ---------------
// var passport = require('passport')
//   , LocalStrategy = require('passport-local').Strategy;

// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     User.findOne({ username: username }, function(err, user) {
//       if (err) { return done(err); }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect username.' });
//       }
//       if (!user.validPassword(password)) {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));

// passport.serializeUser(function(user, done) {
//   done(null, user.id);
// });

// passport.deserializeUser(function(id, done) {
//   User.findById(id, function(err, user) {
//     done(err, user);
//   });
// });

//-------------------Acativate Session--------------
// var session = require("express-session");
// app.use(session({secret: 'hokage',
//                  saveUninitialized: true,
//                  resave: true}));

// //make user ID available in templates
// app.use(function(req,res,next){
//   res.locals.currentUser = req.session.userId;
//   next();
// });

//setup passport
app.use(passport.initialize());
app.use(passport.session());
// ===== testing middleware =====
// app.use(function(req, res, next) {
//   console.log("===== passport user =======");
//   console.log(req.session);
//   console.log(req.user);
//   console.log("===== END =======");
//   next();
// });
// testing
// app.get(
//   "/auth/google/callback",
//   (req, res, next) => {
//     console.log(`req.user: ${req.user}`);
//     console.log("======= /auth/google/callback was called! =====");
//     next();
//   },
//   passport.authenticate("google", { failureRedirect: "/login" }),
//   (req, res) => {
//     res.redirect("/");
//   }
// );

//--------------------------

// var test = require("./routes/test");
// var mongoose = require("mongoose");
var game = require("./routes/game");
var authRoutes = require("./routes/auth.routes");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
// app.use(cors());

// app.use("/test/", test);
// app.use("/auth", authRoutes);
app.use("/auth", authRoutes);
// require("./routes/auth.routes.js")(app);
// require("./routes/game.js")(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// enable cors
// var corsOption = {
//   origin: true,
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//   credentials: true,
//   exposedHeaders: ["x-auth-token"]
// };
// app.use(cors(corsOption));

module.exports = app;
