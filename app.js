var express = require("express");
var path = require("path");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser"); // We will use this to parse the HTTP request body so that we can retrieve data to post to the database
var cors = require("cors");
var passportSetup = require("./config/passport-setup");
var session = require("express-session");
const dbConnection = require("./db");
const MongoStore = require("connect-mongo")(session);
var app = express();

//setup passport
// app.use(passport.initialize());
// app.use(passport.session());

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
app.use(cors());

app.use("/auth", authRoutes);

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

module.exports = app;
