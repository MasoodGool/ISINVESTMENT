const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
let MONGO_URL;
const MONGO_LOCAL_URL =
  "mongodb://MasoodGool:go235070@masood-shard-00-00-yidfg.mongodb.net:27017,masood-shard-00-01-yidfg.mongodb.net:27017,masood-shard-00-02-yidfg.mongodb.net:27017/test?ssl=true&replicaSet=Masood-shard-0&authSource=admin&retryWrites=false";

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI);
  MONGO_URL = process.env.MONGODB_URI;
} else {
  mongoose.connect(MONGO_LOCAL_URL); // local mongo url
  MONGO_URL = MONGO_LOCAL_URL;
}

// should mongoose.connection be put in the call back of mongoose.connect???
const db = mongoose.connection;
db.on("error", err => {
  console.log(`There was an error connecting to the database: ${err}`);
});
db.once("open", () => {
  console.log(
    `You have successfully connected to your mongo database: ${MONGO_URL}`
  );
});

module.exports = db;
