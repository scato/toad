// copyright 2010 scato eggen

var events = require('events');

exports.Event = function() {
    this.listeners = [];
};

exports.Event.prototype.add = function(listener) {
    this.listeners.push(listener);
};

exports.Event.prototype.fire = function(value) {
    this.listeners.slice().forEach(function(listener) {
        // FIXME: use nextTick to prevent exceptions from blocking loop
        listener(value);
    });
};

exports.Event.prototype.map = function(f) {
    var event = new exports.Event();
    
    this.add(function(value) {
        event.fire(f(value));
    });
    
    return event;
};

exports.Event.prototype.delegate = function() {
    var event = this;
    
    return function(value) {
        event.fire(value);
    };
};

exports.Event.prototype.and = function(event) {
    var result = new exports.Event();
    
    this.add(function(left) {
        event.add(function(right) {
            result.fire([left, right]);
        });
    }.bind(this));
    
    event.add(function(right) {
        this.add(function(left) {
            result.fire([left, right]);
        });
    }.bind(this));
    
    return result;
};

exports.Event.prototype.filter = function(f) {
    var event = new exports.Event();
    
    this.add(function(value) {
        if(f(value)) {
            event.fire(value);
        }
    });
    
    return event;
};

exports.Timeout = function(ms) {
    this.ms = ms;
    this.listeners = {};
};

exports.Timeout.prototype = (function() {
    var Parent = function() {};
    Parent.prototype = exports.Event.prototype;
    return new Parent;
})();

exports.Timeout.prototype.constructor = exports.Timeout;

exports.Timeout.prototype.add = function(listener) {
    var id = setTimeout(listener, this.ms);
    this.listeners[id] = listener;
};

exports.Timeout.prototype.remove = function(listener) {
    for(var id in this.listeners) {
        if(this.listeners.hadOwnProperty(id) && this.listeners[id] === listener) {
            clearTimeout(id);
        }
    }
};

exports.Emitted = function(emitter, name) {
    this.emitter = emitter;
    this.name = name;
};

exports.Emitted.prototype = (function() {
    var Parent = function() {};
    Parent.prototype = exports.Event.prototype;
    return new Parent;
})();

exports.Emitted.prototype.constructor = exports.Emitted;

exports.Emitted.prototype.add = function(listener) {
    this.emitter.addListener(this.name, listener);
};

exports.Emitted.prototype.remove = function(listener) {
    this.emitter.removeListener(this.name, listener);
};

exports.now = function() {
    var event = new exports.Event();
    
    process.nextTick(event.delegate());
    
    return event;
};

exports.Promise = function() {
    // FIXME: these events can only fire once, this should be enforced
    this.result = new exports.Event();
    this.error = new exports.Event();
};

exports.Promise.prototype.delegate = function() {
    var promise = this;
    
    return function(error, result) {
        if(error) {
            promise.error.fire(error);
        } else {
            promise.result.fire(result);
        }
    };
};

exports.Promise.prototype.map = function(f) {
    var promise = new exports.Promise();
    
    promise.result = this.result.map(f);
    this.error.add(promise.error.delegate());
    
    return promise;
};

exports.Promise.prototype.delay = function(event) {
    var promise = new exports.Promise();
    
    event.and(this.result).add(function(args) {
        promise.result.fire(args[1]);
    });
    
    event.and(this.error).add(function(args) {
        promise.error.fire(args[1]);
    });
    
    return promise;
};

exports.Promise.prototype.defer = function(f) {
    var promise = new exports.Promise();
    
    this.result.add(function(value) {
        var deferee = f(value);
        
        deferee.result.add(promise.result.delegate());
        deferee.error.add(promise.error.delegate());
    });
    
    this.error.add(promise.error.delegate());
    
    return promise;
};

// create a stream from a promise that delivers an array
exports.Promise.prototype.toStream = function() {
    var stream = new exports.Stream();
    var ready = exports.now();
    
    this.result.add(function(array) {
        array.forEach(function(element) {
            stream.data.fire(element);
        });
        
        stream.end.fire();
    });
    
    return stream;
};

exports.Stream = function() {
    this.data = new exports.Event();
    this.error = new exports.Event();
    this.end = new exports.Event();
};

exports.Stream.prototype.filter = function(f) {
    var stream = new exports.Stream();
    
    stream.data = this.data.filter(f);
    this.error.add(stream.error.delegate());
    this.end.add(stream.end.delegate());
    
    return stream;
};

exports.Stream.prototype.map = function(f) {
    var stream = new exports.Stream();
    
    stream.data = this.data.map(f);
    this.error.add(stream.error.delegate());
    this.end.add(stream.end.delegate());
    
    return stream;
};

exports.Stream.prototype.defer = function(f) {
    var stream = new exports.Stream();
    var ready = null;
    
    this.data.add(function(value) {
        var promise = f(value);
        
        // FIXME: this is the same problem I'm fixing
        // in toad-http, I could use a Message here
        // and push promises (instead of appending
        // streams)
        if(ready === null) {
            ready = exports.now();
        }
        
        ready.and(promise.result).add(function(args) {
            stream.data.fire(args[1]);
        });
        
        ready.and(promise.error).add(function(args) {
            stream.error.fire(args[1]);
        });
        
        ready = ready.and(promise.result);
        
        ready.add(function() {
            ready = null;
        });
    });
    
    this.error.add(stream.error.delegate());
    
    this.end.add(function() {
        // wait for ready to represent the last deferee success
        ready.add(stream.end.delegate());
    });
    
    return stream;
};

