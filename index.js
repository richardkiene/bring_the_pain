var mod_assert = require('assert-plus');
var mod_bunyan = require('bunyan');
var mod_fs = require('fs');
var mod_restify = require('restify');
var mod_sshpk = require('sshpk');

function authenticationHandler(req, res, next) {
    var peerCert = req.connection.getPeerCertificate();
    var cert = mod_sshpk.parseCertificate(peerCert.raw, 'x509');
    var keyId = cert.subjectKey.fingerprint('md5').toString('hex');
    var cn = cert.subjects[0].cn;
    next();
}

function enforceSSLHandler(req, res, next) {
    if (!req.isSecure()) {
        next(new mod_restify.UnauthorizedError());
    } else {
        next();
    }
}

function thePain(req, res, next) {
    res.header('content-type', 'text/plain');
    res.send('Bringing the pain!');
}

var serverOpts = {
    name: 'cmon',
    log: log,
    handleUpgrades: false,
    certificate: mod_fs.readFileSync('tlscert.pem'),
    key: mod_fs.readFileSync('tlskey.pem'),
    requestCert: true,
    rejectUnauthorized: false
};

var log = mod_bunyan.createLogger({
    name: 'cmon',
    serializers: mod_restify.bunyan.serializers
});

var server = mod_restify.createServer(serverOpts);
server.use(function basicResReq(req, res, next) {
    res.on('header', function onHeader() {
        var now = Date.now();
        res.header('Date', new Date());
        res.header('Server', server.name);
        res.header('x-request-id', req.getId());
        var t = now - req.time();
        res.header('x-response-time', t);
        res.header('x-server-name', 'pain bringer');
    });

    next();
});

server.use(enforceSSLHandler);
server.use(authenticationHandler);

server.on('after', function audit(req, res, route, err) {
    // Successful GET res bodies are uninteresting and *big*.
    var body = !(req.method === 'GET' &&
        Math.floor(res.statusCode / 100) === 2);

    mod_restify.auditLogger({
        log: log.child(
            {
                route: route && route.name,
                action: req.query.action
            },
            true),
        body: body
    })(req, res, route, err);
});

server.get({ name: 'bring', path: '/thepain' }, thePain);

server.listen(8080,'127.0.0.1',
    function _logListening() {
        log.info('listening');
});
