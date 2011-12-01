var path = require("path"),
    fs = require("fs"),
    strata = require("strata"),
    Rdio = require("./rdio"),
    _ = require("./assets/js/vendor/underscore"),
    cred = require("./rdio_consumer_credentials");


var root = path.resolve("./assets");
var app = new strata.Builder;


app.use(strata.commonLogger);
app.use(strata.contentType);
app.use(strata.contentLength);
app.use(strata.sessionCookie);


app.route("/", function (env, callback) {
  var session = env.session;
  var accessToken = session.at;
  var accessTokenSecret = session.ats;
  var body;
  var rdio = getRdio(env);
  var heavyP = {
    count: 20,
    limit: 20,
    type: 'albums'
  };
  if (accessToken && accessTokenSecret){
    var extras = [
      'lastSongPlayed',
      'heavyRotationKey',
      'networkHeavyRotationKey',
      'username'
    ];
    rdio.call("currentUser", {extras: extras.join(',')}, function (err, data) {
      if (err && strata.handleError(err, env, callback)) {
        return;
      }
      session.user = data.result;
      heavyP.user = data.result.key;
      heavyP.friends = 'true';
      rdio.call('getHeavyRotation', heavyP, function(err, data){
        if (err && strata.handleError(err, env, callback)) {
         return;
        }

        var template = fs.readFileSync("./templates/home.html", "utf8");
        body = _.template(template, {user:session.user, heavyRotation: JSON.stringify(data.result) });
        callback(200, {}, body); 
      });
    });
  } else {
    rdio.call('getHeavyRotation', heavyP, function(err, data){
        if (err && strata.handleError(err, env, callback)) {
         return;
        }

        var template = fs.readFileSync("./templates/home.html", "utf8");
        body = _.template(template, { user:{}, heavyRotation: JSON.stringify(data.result) });
        callback(200, {}, body); 
      });
  }
});


app.get('/find', function (env, callback){
  var req = new strata.Request(env);
  req.params(function (err, params) {
    if (err && strata.handleError(err, env, callback)) {
      return;
    }
    var rdio = getRdio(env);
    var rParams = { 
      query: params.q, 
      count: 15, 
      types:'Artist,Album,Track,Playlist,User'
    };

    rdio.call("search", rParams, function (err, data) {
      if (err && strata.handleError(err, env, callback)) {
        return;
      }
      if (data.status === 'ok'){
        callback(200, {'Content-Type':'application/json' }, JSON.stringify( data.result ) );
      } else {
        callback(500, {'Content-Type':'application/json' }, JSON.stringify( data.message ) );
      }
    });
  });
});

app.get('/get/:key', function (env, callback){

  var key = env.route.key;
  var rdio = getRdio(env);
    rdio.call("get", {keys: key}, function (err, data) {
      if (err && strata.handleError(err, env, callback)) {
        return;
      }
      if (data.status === 'ok'){
        callback(200, {'Content-Type':'application/json' }, JSON.stringify( data.result[ key ] ) );
      } else {
        callback(500, {'Content-Type':'application/json' }, JSON.stringify( data.message ) );
      }
    });
});

app.get('/get', function (env, callback){
  var req = new strata.Request(env);
  req.params(function (err, params) {
    if (err && strata.handleError(err, env, callback)) {
      return;
    }
    var rdio = getRdio(env);

    rdio.call("get", {keys: params.keys}, function (err, data) {
      if (err && strata.handleError(err, env, callback)) {
        return;
      }
      if (data.status === 'ok'){
        callback(200, {'Content-Type':'application/json' }, JSON.stringify( data.result ) );
      } else {
        callback(500, {'Content-Type':'application/json' }, JSON.stringify( data.message ) );
      }
    });
  });
});



app.get('/suggest', function (env, callback){
  var req = new strata.Request(env);
  req.params(function (err, params) {
    if (err && strata.handleError(err, env, callback)) {
      return;
    }
    var rdio = getRdio(env);
    rdio.call("searchSuggestions", { query: params.q }, function (err, data) {
      if (err && strata.handleError(err, env, callback)) {
        return;
      }
      if (data.status === 'ok'){
        callback(200, {'Content-Type':'application/json' }, JSON.stringify( data.result ) );
      } else {
        callback(500, {'Content-Type':'application/json' }, JSON.stringify( data.message ) );
      }
    });
  });
});

//app.route('/getPlaybackToken', function (env, callback) {}, 'GET')

app.route('/getPlaybackToken', function (env, callback) {
  var req = new strata.Request(env);
  req.params(function (err, params) {
    if (err && strata.handleError(err, env, callback)) {
      return;
    }
    var domain = params.domain;
    var rdio = getRdio(env);
    rdio.call("getPlaybackToken", { domain: domain }, function (err, data) {
      if (err && strata.handleError(err, env, callback)) {
        return;
      }
      callback(200, { }, data.result );
    });
  });
}, 'GET');


app.route("/getHeavyRotation", function (env, callback) {
  var session = env.session;
  var rdio = getRdio(env);
  var params = {
    type: 'albums',
    limit: 20
  }

  if (session.user){
    params.user = session.user.key;
    params.friends = 'true';
  }
  rdio.call("getHeavyRotation", params, function (err, data) {
    if (err && strata.handleError(err, env, callback)) {
      return;
    }
    var heavyRotation = data.result;
    callback(200, { 'Content-Type':'application/json' }, JSON.stringify(heavyRotation));
  });
});



app.route("/login", function (env, callback) {
  var session = env.session = {};
  var req = new strata.Request(env);

  // Begin the authentication process.
  var rdio = new Rdio([cred.RDIO_CONSUMER_KEY, cred.RDIO_CONSUMER_SECRET]);
  var callbackUrl = req.baseUrl + "/callback";

  rdio.beginAuthentication(callbackUrl, function (err, authUrl) {
    if (err && strata.handleError(err, env, callback)) {
      return;
    }

    // Save the request token/secret in the session.
    session.rt = rdio.token[0];
    session.rts = rdio.token[1];

    // Go to Rdio to authenticate the app.
    redirect(authUrl, callback);
  });
}, "GET");

app.route("/callback", function (env, callback) {
  var session = env.session;
  var req = new strata.Request(env);

  req.params(function (err, params) {
    if (err && strata.handleError(err, env, callback)) {
      return;
    }

    var requestToken = session.rt;
    var requestTokenSecret = session.rts;
    var verifier = params.oauth_verifier;

    if (requestToken && requestTokenSecret && verifier) {
      // Exchange the verifier and token for an access token.
      var rdio = new Rdio([cred.RDIO_CONSUMER_KEY, cred.RDIO_CONSUMER_SECRET],[requestToken, requestTokenSecret]);

      rdio.completeAuthentication(verifier, function (err) {
        if (err && strata.handleError(err, env, callback)) {
          return;
        }

        // Save the access token/secret in the session (and discard the
        // request token/secret).
        session.at = rdio.token[0];
        session.ats = rdio.token[1];
        env.userLoggedIn = true;
        delete session.rt;
        delete session.rts;

        // Go to the home page.
        redirect("/", callback);
      });
    } else {
      // We're missing something important.
      redirect("/logout", callback);
    }
  });
}, "GET");

app.route("/logout", function (env, callback) {
  env.session = {};
  delete env.userLoggedIn;
  delete env.user;
  redirect("/", callback);
}, "GET");

app.use(strata.static, root);
var server = strata.run(app, {port: process.env.PORT});

function redirect(location, callback) {
  callback(302, {"Location": location}, 'Go to <a href="' + location + '">' + location + '</a>');
}

function getRdio(env) {
  var session = env.session;
  var accessToken = session.at;
  var accessTokenSecret = session.ats;
  var rdio;

  if (accessToken && accessTokenSecret) {
    rdio = new Rdio([cred.RDIO_CONSUMER_KEY, cred.RDIO_CONSUMER_SECRET],[accessToken, accessTokenSecret]);
  } else {
    rdio = new Rdio([cred.RDIO_CONSUMER_KEY, cred.RDIO_CONSUMER_SECRET]);
  }
  return rdio;
}
