// copyright 2010 scato eggen

require("./es5");

var events = require("./toad-events"),
    fs = require("./toad-fs"),
    http = require("./toad-http");

function getLines() {
    return fs.readdir("/home/scato/doc")
        .toStream()
        .filter(function(file) {
            return file.match(/\.txt$/);
        }).defer(function(file) {
            var data = fs.readFile("/home/scato/doc/" + file);
            
            return data.map(function(data) {
                return file + ": " + data.length + " chars\n";
            });
        });
}

var server = new http.Server(8080);

server.request.add(function(e) {
    var lines = getLines();
    
    e.response.head.write({'content-type': 'text/html'});
    e.response.head.close();
    e.response.body.append(lines);
    e.response.body.close();
});

