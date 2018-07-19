var express = require('express');
var router = express.Router();
/* We created this route in Task 19 to test that we could get
the React front-end to work with the Express backend of our app.
In Task 20 we get this information from the Database instead of
hardcoding data here. See /route/task.js and the related models and
controllers. */ 
/* GET users listing. */
router.get('/', function(req, res, next) {
  console.log('get route for test called')  ;
   res.json([{id: 1, title: 'Testing this task'}, {id: 2, title: 'Get React to interface with Express'}]);

});

module.exports = router;
