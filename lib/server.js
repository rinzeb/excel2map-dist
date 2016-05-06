#!/usr/bin/env node
"use strict";
var _this = this;
var Winston = require('winston');
var fs = require('fs');
var path = require('path');
var auth = require('basic-auth');
var csweb = require("csweb");
Winston.remove(Winston.transports.Console);
Winston.add(Winston.transports.Console, {
    colorize: true,
    label: 'csWeb',
    prettyPrint: true
});
var cs = new csweb.csServer(__dirname, {
    port: 3004,
    swagger: false,
    connectors: {}
});
var passwords = {};
cs.start(function () {
    readPass();
    _this.config = new csweb.ConfigurationService('./configuration.json');
    _this.config.add('server', 'http://localhost:' + cs.options.port);
    var bagDatabase = new csweb.BagDatabase(_this.config);
    var mapLayerFactory = new csweb.MapLayerFactory(bagDatabase, cs.messageBus, cs.api);
    cs.server.post('/projecttemplate', function (req, res) {
        var creds = auth(req);
        if (!creds || !passwords.hasOwnProperty(creds.name) || creds.pass !== passwords[creds.name]) {
            console.log('Wrong password');
            res.statusCode = 401;
            res.end();
        }
        else {
            mapLayerFactory.process(req, res);
        }
    });
    cs.server.post('/requestproject', function (req, res) {
        var project = new csweb.Project;
        project = req.body;
        cs.api.addProject(project, {}, function (result) {
            if (result.result === csweb.ApiResult.OK) {
                if (result.project.hasOwnProperty('id') && !passwords.hasOwnProperty(result.project.id)) {
                    passwords[result.project.id] = generatePass();
                    addPass(result.project.id + ':' + passwords[result.project.id]);
                    result.project['password'] = passwords[result.project.id];
                }
                else {
                    console.log('Password already exists');
                }
            }
            else {
                console.log('ID already exists');
            }
            res.statusCode = result.result;
            res.send(result.project);
        });
    });
    cs.server.post('/updategrouptitle', function (req, res) {
        var creds = auth(req);
        if (!creds || !passwords.hasOwnProperty(creds.name) || creds.pass !== passwords[creds.name]) {
            console.log('Wrong password');
            res.statusCode = 401;
            res.end();
        }
        else {
            var data;
            if (req.body) {
                data = req.body;
                cs.api.updateGroup(data.projectId, data.oldTitle, { id: data.newTitle, title: data.newTitle }, {}, function (result) {
                    if (result && result.result === csweb.ApiResult.OK) {
                        res.statusCode = 200;
                        res.end();
                    }
                    else {
                        res.statusCode = 404;
                        res.end();
                    }
                });
            }
        }
    });
    cs.server.post('/clearproject', function (req, res) {
        var creds = auth(req);
        if (!creds || !passwords.hasOwnProperty(creds.name) || creds.pass !== passwords[creds.name]) {
            console.log('Wrong password');
            res.statusCode = 401;
            res.end();
        }
        else {
            var data;
            if (req.body) {
                data = req.body;
                if (!data.hasOwnProperty('projectId')) {
                    res.statusCode = 404;
                    res.end();
                }
                else {
                    cs.api.clearProject(data.projectId, {}, function (result) {
                        if (result && result.result === csweb.ApiResult.OK) {
                            res.statusCode = 200;
                            res.end();
                        }
                        else {
                            res.statusCode = 404;
                            res.end();
                        }
                    });
                }
            }
        }
    });
    cs.server.post('/bagsearchaddress', function (req, res) {
        mapLayerFactory.processBagSearchQuery(req, res);
    });
    console.log('Excel2map functions started');
});
function generatePass() {
    var s = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    return 'p' + s + (Date.now() % 9);
}
;
function readPass() {
    var pwfile = path.join(__dirname, '.users.htpasswd');
    fs.exists(pwfile, function (exists) {
        if (exists) {
            fs.readFile(pwfile, 'utf8', function (err, data) {
                if (err) {
                    console.log('Error reading htpasswds');
                    return;
                }
                var entries = data.split('\n');
                entries.forEach(function (e) {
                    var un_pw = e.split(':');
                    passwords[un_pw[0]] = un_pw[1];
                });
            });
        }
    });
}
function addPass(entry) {
    var pwfile = path.join(__dirname, '.users.htpasswd');
    fs.exists(pwfile, function (exists) {
        if (exists) {
            fs.appendFile(pwfile, '\n' + entry, { encoding: 'utf8' }, function (err) {
                if (err) {
                    console.log('Error adding htpasswd');
                    return;
                }
            });
        }
        else {
            fs.writeFile(pwfile, entry, { encoding: 'utf8' }, function (err) {
                if (err) {
                    console.log('Error writing htpasswd file');
                    return;
                }
            });
        }
    });
}
//# sourceMappingURL=server.js.map