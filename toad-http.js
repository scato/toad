// copyright 2010 scato eggen

var http = require("http")
    events = require("./toad-events");

// FIXME: this is a stream, only one that you can write to
// this is - in other words - a stand alone stream!
exports.Message = function() {
    this.data = new events.Event();
    this.end = new events.Event();
    this.last = null;
}

exports.Message.prototype.write = function(data) {
    this.data.fire(data);
}

exports.Message.prototype.resume = function() {
    if(this.last === null) {
        return events.now();
    } else {
        return this.last.end;
    }
}

exports.Message.prototype.close = function() {
    var resume = this.resume();
    
    resume.add(this.end.delegate());
}

exports.Message.prototype.append = function(stream) {
    var resume = this.resume();
    
    resume.and(stream.data).add(function(args) {
        this.write(args[1]);
    }.bind(this));
    
    resume.and(stream.end).add(function() {
        if(this.last === stream) {
            this.last = null;
        }
    }.bind(this));
    
    this.last = stream;
}

exports.Request = function(request) {
    this.method = request.method;
    this.url = request.url;
    
    this.data = new events.Emitted(request, 'data');
    this.end = new events.Emitted(request, 'end');
}

exports.Response = function(response) {
    this.head = new exports.Message();
    this.body = new exports.Message();
    
    this.head.data.add(function(data) {
        response.writeHead(data);
    });
    
    this.head.end.and(this.body.data).add(function(args) {
        response.write(args[1]);
    });
    
    this.head.end.and(this.body.end).add(function() {
        response.end();
    });
}

exports.Server = function(port) {
    this.request = new events.Event();
    
    var server = http.createServer(function(request, response) {
        this.request.fire({
            request: new exports.Request(request),
            response: new exports.Response(response)
        });
    }.bind(this));
    
    server.listen(port);
};

