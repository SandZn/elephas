'use strict';

var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    flash = require('express-flash'),
    multer  = require('multer'),
    helmet = require('helmet'),
    compression = require('compression'),
    expressWinston = require('express-winston'),
    logger = require('./logger');

var RedisStore = require('connect-redis')(session);


var timeout = require('connect-timeout');


module.exports = function(done, app, redisClient) {
    var connectSrc = ["'self'"];

    if (process.env.NODE_ENV !== 'production') {
        connectSrc.push("ws://*:7000");
    }


    app.use(helmet.csp({
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.newrelic.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 's3-ap-southeast-2.amazonaws.com', 'www.gravatar.com', "data:"],
        connectSrc: connectSrc,
        fontSrc: ["'self'"],
        objectSrc: ["'self'", 's3-ap-southeast-2.amazonaws.com'],
        mediaSrc: ["'self'", 's3-ap-southeast-2.amazonaws.com'],
        frameSrc: ["'self'"],
        // sandbox: ['allow-forms', 'allow-scripts'],
        // reportUri: '/report-violation',
        // reportOnly: false, // set to true if you only want to report errors
        setAllHeaders: false, // set to true if you want to set all headers
        safari5: false // set to true if you want to force buggy CSP in Safari 5
    }));


    app.use(helmet.xssFilter());
    app.use(helmet.xframe());
    app.use(helmet.hsts({
        maxAge: 7776000000,
        includeSubdomains: true
    }));

    app.use(helmet.crossdomain({ caseSensitive: true }));
    app.use(helmet.nosniff());
    app.use(helmet.ienoopen());

    app.use(cookieParser());

    var redisSessionOptions = {
        client: redisClient,
        ttl: 60 * 60 //seconds
    };

    app.use(session({
        store: new RedisStore(redisSessionOptions),
        // cookie: {httpOnly: true, secure: true}, // This breaks the login!!
        saveUninitialized: true,
        resave: true,
        secret: 'F*_WgXEN6=V-7xJLKvKF%6-NnZR7j^_gJX*@B4cATw#6@X%wkHP*_zV_8_3zXQRuu!=kGyds&+TMp^KB&=h^@NPd_KXQ3q%EXd=eJZ8m$*Zr@@B2!9Q^nPypTtqX^upJ'})
    );
    app.use(bodyParser.json({limit: 10 * 1024 * 1024})); //10MB limit
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(flash());
    app.use(multer({ dest: './tmp/uploads/'}));
    app.disable('x-powered-by');

    app.use(compression({
        threshold: 1024 * 1
    }));
    
    // expressWinston.requestWhitelist.push('session');

    app.use(expressWinston.logger({
        winstonInstance: logger,
        // optional: control whether you want to log the meta data about the request (default to true)
        meta: false,
        // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
        msg: "{{req.method}} {{res.statusCode}} {{res.responseTime}}ms {{req.url}} {{req.session ? req.session.passport.user : ''}}",
        // Use the default Express/morgan request formatting, with the same colors. Enabling this will override any msg and colorStatus if true. Will only output colors on transports with colorize set to true
        expressFormat: false,
        // Color the status code, using the Express/morgan color palette (default green, 3XX cyan, 4XX yellow, 5XX red). Will not be recognized if expressFormat is true
        colorStatus: false,
        // different HTTP status codes caused log messages to be logged at different levels (info/warn/error), the default is false
        statusLevels: true,
        // requestFilter: function(req, propName) {
        //     console.log(propName);
        //     return req[propName];
        // }
    }));

    app.use(timeout(40 * 1000));

    done();
};