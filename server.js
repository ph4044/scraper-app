var express = require("express");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var path = require("path");

// SCRAPING TOOLS:
// Cheerios parses our HTML and helps us find elements.
var cheerio = require("cheerio");

// Axios is a promised-based HTTP library, similar to jQuery's Ajax method.
// It works on the client and on the server.
var axios = require("axios");

var logger = require("morgan");
// var router = express.Router();

// Require all models
var db = require("./models");

// Set up the Express App
var app = express();
var PORT = process.env.PORT || 3000;

// CONFIGURE MIDDLEWARE:
// Use morgan logger for logging requests.
app.use(logger("dev"));

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make public a static folder
// app.use(express.static("public"));
app.use(express.static(path.join(__dirname, 'public')))

// Set Handlebars as the default templating engine.
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || ("mongodb://localhost/mongoHeadlines");
mongoose.connect(MONGODB_URI);

// var routes = require("./controllers/controller.js");
// app.use(routes);


// Routes
// app.get("/", function(req, res) {
//   console.log("root request");
//   res.render("index", {});
// });

  // A GET route for scraping the Citizen news website.
  app.get("/scrape", function (req, res) {
    // First, we grab the body of the HTML with Axios.
    axios.get("https://thecitizen.com/category/news/business/").then(function (response) {
      // Then, we load that into cheerio and save it to $ for a shorthand selector
      var $ = cheerio.load(response.data);
      // Now, we grab every tag with class 'entry-title' and do the following:
      $(".entry-title").each(function (i, element) {
        // Save an empty 'result' object
        var result = {};
        // Add the text and href of every link, and save them as properties of the 'result' object
        result.title = $(this)
          .children("a")
          .text();  //was .text()
        result.link = $(this)
          .children("a")
          .attr("href");
       // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
      .then(function(dbArticle) {
        // View the added result in the console
        console.log(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, log it
        console.log(err);
      });
  });

    // Send a message to the client
    // res.redirect("/articles");
    // res.send("Scrape Complete");
    res.redirect("/");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});
// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});