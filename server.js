"use strict";

require('dotenv').config();

const PORT        = process.env.PORT || 8080;
const ENV         = process.env.ENV || "development";
const express     = require("express");
const bodyParser  = require("body-parser");
const sass        = require("node-sass-middleware");
const app         = express();
const bcrypt        = require("bcryptjs");
const session = require("cookie-session");
const api           = require("api");
const request       = require("request");

const knexConfig  = require("./knexfile");
const knex        = require("knex")(knexConfig[ENV]);
const morgan      = require('morgan');
const knexLogger  = require('knex-logger');
const jquery      = require("jquery")

const WolframAlphaAPI = require('wolfram-alpha-api');
const waApi = WolframAlphaAPI('ULL5QV-HEQ3H8K997');

const DataHelpers = require("./db/util/data-helpers.js")(knex);

const usersRoutes = require("./routes/users")(DataHelpers);

// Seperated Routes for each Resource
//const usersRoutes = require("./routes/users");
// ******************************************************
// STANDARD CONSTANTS

const saltRounds = 10;
// console.log($("#newTask").val())
let search //=

let userDetails;

const keywordObj = {
  book       : ["book"],
  movie      : ["movie", "academyaward"]
};

let resultsObj = {};



// ******************************************************
//USES

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/styles", sass({
    src: __dirname + "/styles",
    dest: __dirname + "/public/styles",
    debug: true,
    outputStyle: 'expanded'
}));
app.use(express.static("public"));

// Mount all resource routes
// app.use("/api/users", usersRoutes(knex));

app.use(bodyParser.urlencoded({extended: true}));


// Use a cookie to store session data
app.use(
  session({
    name: "session",
    keys: ['my super secret', 'awesome key'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  })
);

// ******************************************************
// FUNCTIONS

function seedInitialRecord(userid) {
  let templateVar = {
    user_id: userid,
    task_name: "Sign Up For ToDo List",
    category_id: 4,
    url: "www.todo.com",
    priority: true,
    status: true
  }
  // console.log(templateVar);
  DataHelpers.dbInsertTask(templateVar)
    .then(function (data) {
      if (!data) {
        console.log('Insert Seed record failed')
      } else {
        console.log("Success - inserted 1 record into Tasks");
      }
    });
}

const compareWordCounter = (compareWord, queryresult) => {
  let intMatches = JSON.stringify(queryresult).replace(/\s/g, '').toLowerCase().split(compareWord.toLowerCase()).length - 1;
  return intMatches;
};

const wolframAPICall = (strInput) => {
  return waApi
  .getFull({
    input: strInput,
    format: 'plaintext',
  })
  .then((queryresult) => queryresult) //return queryresult
  .catch((err) => {
    console.error(err);
    return {}
  })
};

const getData = (url) => {
  // Setting URL and headers for request
  let options = {
    url: url,
    headers: {
      'User-Agent': 'request'
    }
  };
  // Return new promise
  return new Promise(function(resolve, reject) {

    request.get(options, function(err, resp, body) {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    })
  })
}

const main = (search) => {
  let searchStr =  'https://opentable.herokuapp.com/api/restaurants?city=Toronto&per_page=25&name=' + search;
  return getData(searchStr)
  .then(body => {
    const jsonBody = JSON.parse(body)
    if (jsonBody.total_entries === 0){
      return Promise.reject("no result found")
    }


    // if result is zero, return Promise.reject("no result found")
    //return Promise.reject("no result found")
    //have data for opentable
    return Promise.resolve("2") // 2 is the category key for RESTAURANT
  })
  .then(function(result) { //openTable results
    // console.log("userDeets: ", userDetails) // openTable results
    return Promise.resolve(result);

  })
  .catch(err => { // potential WA call 1
    return wolframAPICall(search).then((result)=>{
      if (result.success === false) {
        return Promise.reject("no WA data")
      }
      const apiResults = result;
      for (keywordCategory in keywordObj){

        if (!resultsObj[keywordCategory]) {
          resultsObj[keywordCategory] = 0;
        }

        for (let j of keywordObj[keywordCategory]){

          const compareWord = j;
          const matchCount = compareWordCounter(compareWord, apiResults);
          resultsObj[keywordCategory] += matchCount;

        }
      }
      // console.log("resultsObj.book: ", resultsObj.book)
      // console.log("resultsObj.movie: ", resultsObj.movie)
      if (resultsObj){
        if (resultsObj.book > resultsObj.movie){
          return Promise.resolve("3")
        } else if(resultsObj.movie > resultObj.book) {
          return Promise.resolve("1")
        } else{
          return Promise.resolve("4")
        }
      }
    })
  })
}






// ******************************************************

// Home page - No DB Interaction
app.get("/", (req, res) => {
    res.render("index");
});

// Register New User page - No DB Interaction
app.get("/register", (req, res) => {
  res.render("register");
});

// Save New User - Insert New record into todo_users table
app.post("/register", (req, res) => {
let templateVar = {
  // user_id: req.session.user_id,
  userName : req.body.username,
  password : req.body.password,
  email : req.body.email,
  first_name : req.body.firstName,
  last_name : req.body.lastName,
  address : req.body.address,
  mobile : req.body.telephone,
  dob : req.body.birthdate || "01/01/1980",
  gender : req.body.gender || "U"
}
  // console.log(req.body);
  DataHelpers.dbInsertUser(templateVar)
  .then(function(data) {
    if (!data) {
      res.status(403).send('Username already exists - try a different one')
    } else {
      console.log("Success");
      seedInitialRecord(data[0]);
      console.log("Success - Username inserted", data[0]);
      res.render("index");
    }
  });

});


// Check if the Username and Password checks out with the DB.
app.post("/login", (req,res) => {
  const userName = req.body.username;
  const userPassword  = req.body.password;

  DataHelpers.dbCheckUser(userName, userPassword)
  .then(function(data) {
    // console.log('X',data);
    if (!data) {
      res.status(403).send('Username or Password is incorrect - please check again')
    } else {
      // console.log("Successful");
      // console.log("Success", data[0].id);
      req.session.user_id = data[0].id;
      // console.log("Success", req.session.user_id);
      req.session.user_name = data[0].username;
      res.redirect("/personal");
    }
  });
});

// Logout and clear the cookies.
app.post("/logout", (req,res) => {
  res.clearCookie('user_id');
  res.redirect('/');
});


// Dashboard - Get all the Tasks from the DB for the logged in User.
app.get("/personal", (req, res) => {
  let templateVar = {
    user_id: req.session.user_id
  }
  // console.log(req.body);
  DataHelpers.dbAllGetTasks(templateVar)
  .then(function(data) {
    if (!data) {
      res.status(403).send('Failed to Insert')
    } else {
      // console.log("Success");
      let taskData = { data }
      res.render("personal", taskData);
    }
  });
});

// Show New Task screen the logged in User. No DB Interaction.
app.get("/tasks/new", (req, res) => {
  res.render("newTask");
});



// Insert New Task for the logged in User into DB .
app.post("/tasks", (req, res) => {
  const getCategory = new Promise((resolve, reject) => {
    main(req.body.search)
      .then((result) => {
        resolve(result);
      })
      .catch(err => {
        resolve('4');
      });
  })

  getCategory.then(category_id => {
    console.log('Main:', category_id)

    let templateVar = {
      task_name: req.body.search,
      user_id: req.session.user_id,
      category_id : category_id,
      url : "www.seagate.com",
      priority : "false",
      status : "false"
    };

    console.log('template:', templateVar);
    DataHelpers.dbInsertTask(templateVar)
      .then(function(data) {
        if (!data) {
          res.status(403).send('Failed to Insert')
        } else {
          res.redirect("/personal");
        }
      });
  });
});

// displays page of a tasks of a specific id
app.get("/tasks/:id", (req, res) => {
  let templateVar = {
    user_id: req.session.user_id,
    taskid: '5'
  }
  console.log(req.body);
  console.log(templateVar);
  DataHelpers.dbGet1Tasks(templateVar)
  .then(function(data) {
    if (!data) {
      res.status(403).send('Failed to Insert')
    } else {
      console.log("Success");
      console.log(data);
      res.render("tasks");
    }
  });
});

// add a task of a specific id
app.put("/tasks/:id", (req, res) => {
  let templateVar = {
    task_id : "8",
    task_name : "Hard Disk",
    user_id: req.session.user_id,
    category_id : "3",
    url : "www.seagate.ca",
    priority : "false",
    status : "false"
  }
  console.log(req.body);
  DataHelpers.dbUpdate1Tasks(templateVar)
  .then(function(data) {
    if (!data) {
      res.status(403).send('Failed to Update')
    } else {
      console.log("Success");
      res.render("personal");
    }
  });
  res.redirect("/tasks/:id");
});

// delete call for removing specific task
app.post("/personal/:id/delete", (req, res) => {
  let templateVar = {
    task_id : req.params.id,
    user_id: req.session.user_id
  }
  console.log(req.body);
  console.log(templateVar);
  DataHelpers.dbDelete1Tasks(templateVar)
  .then(function(data) {
    console.log("Success");
    res.redirect("/personal");
  });
});

// Update individual task to be IMPORTANT
app.post("/personal/:id/priority", (req, res) => {
  let templateVar = {
    task_id : req.params.id,
    user_id : req.session.user_id,
    priority : true
  }

  DataHelpers.dbUpdate1Tasks(templateVar)
  .then(function(data) {
    if (!data) {
      res.status(403).send('Failed to Evaluate')
    } else {
      console.log('Success')
      res.redirect('/personal')
    }
  })
})

// Update individual task to be COMPLETED
app.post("/personal/:id/complete", (req, res) => {
  let templateVar = {
    task_id : req.params.id,
    user_id : req.session.user_id,
    status : true
  }

  DataHelpers.dbUpdate1Tasks(templateVar)
  .then(function(data) {
    if (!data) {
      res.status(403).send('Failed to Evaluate')
    } else {
      // console.log('Success')
      res.redirect('/personal')
    }
  })
})

// displays profile editing page of specific user
app.get("/profile/:id", (req, res) => {

  let templateVar = {
    user_id: req.session.user_id
  }
  // console.log(req.body);
  DataHelpers.dbGetUserDet(templateVar)
  .then(function(data) {
    if (!data) {
      res.status(403).send('Failed to get details for user')
    } else {
      // console.log("Success");
      // console.log(data);
      res.render("profile", data);
      }
  });
});

// updates user profile
app.put("/profile", (req, res) => {
  let templateVar = {
    // id : req.session.id,
    user_id: req.session.user_id,
    first_name : "Kermit",
    last_name : "Lee",
    address : "ON",
    email : "joe@joe.ca",
    mobile : "2222222",
    dob : "01/01/1980",
    gender : "M"
  }
  // console.log(req.body);
  DataHelpers.dbUpdate1User(templateVar)
  .then(function(data) {
    if (!data) {
      res.status(403).send('Failed to Update specific user')
    } else {
      // console.log("Success");
      res.render("personal");
    }
  });
});


// ******************************************************

app.listen(PORT, () => {
    console.log("Example app listening on port " + PORT);
});
