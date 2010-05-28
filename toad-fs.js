var fs = require("fs");
var events = require("./toad-events");

exports.readdir = function(path) {
    var promise = new events.Promise();
    
    fs.readdir(path, promise.delegate());
    
    return promise;
};

exports.readFile = function(filename, encoding) {
    var promise = new events.Promise();
    
    if(arguments.length < 2) {
        fs.readFile(filename, promise.delegate());
    } else {
        fs.readFile(filename, encoding, promise.delegate());
    }
    
    return promise;
};

exports.writeFile = function(filename, data, encoding) {
    var promise = new events.Promise();
    
    if(arguments.length < 3) {
        fs.readFile(filename, data, promise.delegate());
    } else {
        fs.readFile(filename, data, encoding, promise.delegate());
    }
    
    return promise;
};

