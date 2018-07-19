module.exports = function(app) {
/*It is important to use the app object here. One reason for this is that in app.js
we have specified the app object will use body-parser.
The statement app.use(bodyParser.json()); takes the data stored in the body
of the HTTP reqest and parsers it into JSON so that we can retrieve and work with this data */

    var games = require('../controllers/task.controller.js');

    // Create a new Task
    app.post('/game', games.create);

    // Retrieve all Tasks
    app.get('/game', games.findAll);

    app.get('/game/sorted',games.findSorted);

    // Retrieve a single Note with noteId
	app.get ( '/game/:gameId' , games.findOne );
	// Update a Note with noteId
	/*app.put ( '/game/:gameId' , games.update );*/
	// Delete a Note with noteId
	app.delete ( '/game/:gameId' , games.delete );
}
