const PORT        = process.env.PORT || 3000;
const ENV         = process.env.ENV || "development";
const express     = require("express");
const bodyParser  = require("body-parser");
// const sass        = require("node-sass-middleware");
const app         = express();
const bcrypt        = require("bcryptjs");
const session =     require("cookie-session");
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

const keywordObj = {
  book       : ["book"],
  movie      : ["movie", "academyaward"]
};

let resultsObj = {};

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
      return Promise.reject(search)
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
    return wolframAPICall(err)
    .then((result)=>{
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
      console.log(resultsObj)
      // console.log("resultsObj.book: ", resultsObj.book)
      // console.log("resultsObj.movie: ", resultsObj.movie)
      // if (resultsObj){
        // console.log(resultsObj.book)
        // console.log(resultsObj.movie)

        if (resultsObj.book > resultsObj.movie){
          return Promise.resolve("3")
        } else if(resultsObj.movie > resultObj.book) {
          return Promise.resolve("1")
        } else{
          return Promise.resolve("4")
        }
      // }
    })
  })
}

main('Harry Potter')
      .then((result) => {
        console.log(result);
      })
      .catch(err => {
        console.log('This is 4');
      });

 // const getCategory = new Promise((resolve, reject) => {
 //    main(req.body.search)
 //      .then((result) => {
 //        resolve(result);
 //      })
 //      .catch(err => {
 //        resolve('4');
 //      });
 //  })

 //  getCategory.then(category_id => {
 //    console.log('Main:', category_id)

 //    let templateVar = {
 //      task_name: req.body.search,
 //      // user_id: req.session.user_id,
 //      category_id : category_id,
 //    //   url : "www.seagate.com",
 //    //   priority : "false",
 //    //   status : "false"
 //    //
 //    };
 //  });



