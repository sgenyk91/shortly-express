var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'stfu',
  resave: false,
  saveUninitialized: true
}));


app.get('/', util.checkUser, function(req, res) {
  res.render('index');
});

app.get('/create', util.checkUser, function(req,  res) {
  res.render('index');
});

app.get('/links', util.checkUser, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/logout', function(req, res) {
  req.session.destroy(function(){
    res.redirect('/login');
  });
});

app.get('/login', function (req, res){
  res.render('login');
});

app.post('/login', function (req, res){
  var username = req.body.username;

  new User({username: username}).fetch().then(function(userModel){
    if (userModel) {
      bcrypt.compare(req.body.password, userModel.get('password'), function(err, matched) {
        if (err) console.log("err", err);
        if (matched) {
          // spawn a session
          // res.redirect('/');
          util.createSession(req, res, user);
          });
        } else {
          res.redirect('/login'); //incorrect both
        }
      });
    } else {
      res.redirect('/login'); //incorrect both
    }
  });
});

app.get('/signup', function(req, res) {
  res.render('signup', {usernameTaken: false});
});

app.post('/signup', function(req, res) {
  var username = req.body.username;

  if (req.body.password.length < 6) {
    res.redirect('http://www.youareanidiot.org/');
  }

  // if username is unique
  new User({username: username}).fetch().then(function(userModel){
    // send error to client if username exists
    if (userModel) {
      res.render('signup', {usernameTaken: true});
    } else {
      // store it
      bcrypt.hash(req.body.password, 8, function(err, hashedPassword) {
        if (err) console.log(err);
          Users.create({
            username: username,
            password: hash
          }).then(function(user) {
              util.createSession(req, res, user);
          });
      });

    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
