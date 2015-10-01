#!/usr/bin/env node

var db = process.env.MONGOLAB_URI || 'mongodb://localhost/zmote-server-dev';

var config =  {
    db: db,
    port: 2883,
    http: {
        port: 2885,
        bundle: true,
        static: './public'
    },
    host: '0.0.0.0',
};
var client_config = {
    host: 'localhost',
    port: config.port,
    clientId: "admin_broker",
    username: db.replace(/^mongodb:\/\//, '').replace(/:.*/, ''),
    password: db.replace(/^mongodb:\/\/.*?:/, '').replace(/@.*/, '')
};

var fs = require('fs');
var mosca = require('mosca');
var mongoose = require('mongoose');
var Q = require('q');

require('./dbmodels/widget.server.model.js');
var Widget = mongoose.model('Widget');
var connectDB = (function () {
    var deferred = Q.defer();
    mongoose.connect(config.db, function(err) {
        if (err) {
            console.error('Could not connect to MongoDB!');
            console.log(err);
            deferred.reject(err);
        } else {
            console.log("Connected to DB");
            deferred.resolve(true);
        }
    });
    return deferred.promise;

})();



var server = new mosca.Server(config, function (err) {
    if (err)
        console.error("Error starting mosca", err);
    console.log("Server started");
});

server.on('clientConnected', function(client) {
    console.log('client connected', client.id);
});
server.on('clientDisconnected', function(client) {
    console.log('client disconnected', client.id);
});

server.on('error', function(err) {
    console.error('server error', err);
});
server.on('ready', setup);

var authenticate = function (client, username, password, callback) {
    var auth = false;
    password = password.toString();
    if (username == client_config.username && password == client_config.password) {
        callback(null, true);
        return;
    }
    connectDB
        .then(function () {
            return Widget.findById(username);
        })
        .then(function (widget) {
            if (!widget) {
                console.log("Widget "+username+" not found");
                return true;
            }
            if (client.id == widget.chipID && widget._id == username && widget.secret == password) {
                console.log(client.id + " auth suceeded");
                client.type = 'widget';
                console.log("IP: ", client.connection.stream.remoteAddress);
                auth = true;
                widget.extIP = client.connection.stream.remoteAddress;
                return widget.save();
            } else {
                console.log(client.id + " auth FAIL");
                //console.log(client.id, username, password, widget);
                return true;
            }
        })
        .then(function () {
            console.log("Auth finished");
            callback(null, auth);
        }, function (err) {
            console.error("MDB search error", err.stack);
            callback(null, auth);
        });
};

var authorizePublish = function(client, topic, payload, callback) {
    var path = topic.split('/');
    //console.log("Auth Publish");
    //console.log("client.type", client.type);
    //console.log("topic", topic, payload.toString());
    if (client.id.match(/^admin/)) {
        callback(null, true);
        return;
    }
    if (path.length !== 3 || path[0] !== 'zmote' || path[1]  !== 'widget' || path[2] !== client.id) {
        console.log("publish disallowed: client=\""+client.id+"\" topic=\""+topic+"\"", path);
        callback("auth denied", false);
    } else {
        //console.error("Publish allowed");
        callback(null, true);
    }
};

var authorizeSubscribe = function(client, topic, callback) {
    var path = topic.split('/');
    //console.log("Auth Subscribe");
    //console.log("client.type", client.type);
    //console.log("topic", topic);
    if (client.id.match(/^admin/)) {
        callback(null, true);
        return;
    }
    //console.log("auth sub", client.id, topic);
    if (path.length !== 3 || path[0] !== 'zmote' || path[1] !== 'towidget' || path[2] !== client.id) {
        console.log("subscribe disallowed: client=\""+client.id+"\" topic=\""+topic+"\"");
        callback("auth denied", false);
    } else
        callback(null, true);
};

function setup() {
    console.log('zmote broker is up and running');
    server.authenticate = authenticate;
    server.authorizePublish = authorizePublish;
    server.authorizeSubscribe = authorizeSubscribe;

    var mqtt    = require('mqtt');
    var client  = mqtt.connect(client_config);
     
    client.on('connect', function () {
      client.subscribe('zmote/widget/#');
    });
     
    client.on('message', function (topic, message) {
      // message is Buffer 
      try {
        var msg = JSON.parse(message.toString());
      } catch(err) {
        console.log("Bad message", err);
        return;
      }
      console.log("Message", msg);
      var path = topic.split('/');
      connectDB
        .then(function () {
            return Widget.findOne({chipID: path[2]});
        })
        .then(function (widget) {
            if (msg.disconnected) {
                widget.connected = false;
            } else if (msg.goodbye) {
                widget.connected = false;
                widget.ota = true;
            } else if (msg.ip && msg.ts) { // Hello message
                widget.localIP = msg.ip;
                widget.version = msg.version;
                widget.fs_version = msg.fs_version;
                widget.connected = true;
                widget.ota = false;
            }
            widget.lastEvent = new Date();
            //console.log("widget", widget, widget.save);
            return widget.save();
        })
        .then(function () {
            console.log("Widget record updated");
        }, function (err) {
            console.error("Unexpected error", err.stack);
        });
    });
}
