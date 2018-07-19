var Game = require('../models/game.model.js');
var mongoose = require('mongoose');

/*exports.create = function(req, res) {
    // Create and Save a new Task
    console.log('backend');
    console.log(req.body.title);
    var game = new Game({title: req.body.title});
    game.save(function(err, data) {
        if(err) {
            console.log(err);
            res.status(500).send({message: "Some error occurred while creating the task."});
            console.log("Some error occurred while creating the task.");
        } else {
          res.send(data);z
          console.log(req.body);
        }
    });
};
*/
exports.create = function(req, res) {
    // Create and Save a new Task

    if(!req.body.title) {
      /*test that the request contains content in the body. When testing this with Postman
      make sure that 1) you select the post method on the URL http://localhost:3001/task (remember we specified that
    we are using port 3001 in the package.json file).2) That you specify keys 'title' and 'description' with
    corresponding values in the body of the request. Use x-www-form-urlencoded. Postman will then send an HTTP request
    to your app which contains the relevant data about the task you want to add to your database.  */
        res.status(400).send({title: "Task cannot be empty"});
    }else {
      /* Since you have called this function using app.post (see /routes/task.js) and since your app uses
      body-parser middleware (app.use(bodyParser.json());) the body has been parsed into a JSON object.
      That is why your code will recognise req.body.title and req.body.description. */
      console.log('This has been received:');
      console.log(req.body);
      console.log(req.body.title);
       var game = new Game({
        title:req.body.title,
        description:req.body.description,
        price:req.body.price,
        deadline:req.body.deadline
      });
   console.log(game);
    game.save(function(err, data) {
        if(err) {
            console.log(err);
            res.status(500).send({title: "Some error occurred while creating the task."});
        } else {
          res.json(data);
          //res.send(data);
          console.log('This is our game:');
          console.log(game);
        }
    });
  }
};

exports.findAll = function(req, res) {
  console.log('in findAll');
    // Retrieve and return all notes from the database.
    Game.find(function(err, games){
        if(err) {
          console.log(err);
            res.status(500).send({message: "Some error occurred while retrieving tasks."});
        } else {
          //  res.send(tasks);
          res.json(games);
            console.log(games);
        }
    });
};

exports.findSorted = function(req, res) {
  console.log('in findSorted');
    // Retrieve and return all notes from the database.
        Game.find({}).sort('deadline').exec(function(err, games){
        if(err) {
          console.log(err);
            res.status(500).send({message: "Some error occurred while retrieving tasks."});
        } else {
          //  res.send(tasks);
          res.json(games);
            console.log(games);
        }
    });
};


exports.findOne = function(req, res) {
  console.log('in findOne');
    // Retrieve and return all notes from the database.
    console.log(':game ID')
    console.log(req.params.gameId);
    var id = mongoose.Types.ObjectId(req.params.gameId);
/*    var id = req.params.gameId;*/
    console.log(id);
    Game.findById(id,function(err, games){
        if(err) {
          console.log(err);
            res.status(500).send({message: "Some error occurred while retrieving tasks."});
        } else {
          //  res.send(tasks);
          res.json(games);
            console.log("This is what we found:");
            console.log(games);
        }
    });
};

exports.delete = function(req, res) {
  console.log('in findAndDelete');
    // Retrieve and return all notes from the database.
    console.log(':game ID')
    console.log(req.params.gameId);
    var id = mongoose.Types.ObjectId(req.params.gameId);
/*    var id = req.params.gameId;*/
    console.log(id);
    Game.findByIdAndRemove(id,function(err){
        if(err) {
          console.log(err);
            res.status(500).send({message: "Some error occurred while retrieving tasks."});
        } else {
          //  res.send(tasks);
          /*res.json(games);*/
            console.log("Your game has been deleted :");
        }
    });
};