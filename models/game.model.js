var mongoose = require('mongoose');

var GameSchema = mongoose.Schema({
    title: {type:String, required:true},
    description: String,
    price: {type:Number, required:true},
    added: {type:Date, default: "02-02-2000"},
    completed:{type:Boolean, default:false, required:false},
    deadline:{type:Date, required:false},
});

module.exports = mongoose.model('Games', GameSchema);
