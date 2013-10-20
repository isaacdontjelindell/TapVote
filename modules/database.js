var pg = require("pg"); // PostgreSQL client library
var Q = require("q");

// this should be used anytime we need to connect to the DB
var CONNSTRING = "postgres://postgres:wearetapvote@localhost/tapvotetest";

var recordVote = function (voteData, callback) {
    // voteData = {'answerId':5, 'questionId':5}
    runQuery("INSERT INTO vote(answerid, questionid) VALUES($1, $2)", [voteData['answerId'], voteData['questionId']])
    .then(function (results) {
              logger.info("Recorded vote in database.");
              callback(null, results);
              return;
    })
    .fail(function (error) {
              logger.error("Error logging vote to database.", error);
              callback(error);
              return;
    });
};

var getSurveyInfo = function(surveyData, callback) {
    // surveyData = {'surveyId':34}
    var surveyId = surveyData['surveyId'];

    runQuery("SELECT * FROM survey WHERE id=$1", [surveyId])
    .then(function (results) {
        var surveyInfo = {};

        surveyInfo['title'] = results.rows[0].title;
        surveyInfo['questions'] = [];
        return surveyInfo;
    })
    .then(function (surveyInfo) {
        // get questions for survey
        return runQuery("SELECT * FROM question WHERE surveyid=$1", [surveyId])
        .then(function (results) {
            var questions = results.rows;
            return Q.all(questions.map(function (question) {
                // get answers for each question
                return runQuery("SELECT * FROM answer WHERE questionid=$1", [question.id])
                .then(function (answers) {
                    question.answers = answers.rows;
                    return question;
                })
                .thenResolve(question);
            }))
        });
    })
    .then(function (results) {
        logger.info(results);
    });


    var res = { title: "A sweet survey",
                questions: [
                    { id:12,
                      value:"What is your favorite color",
                      answers: [
                          {id:45, value:"blue"},
                          {id:32, value:"red"}
                      ]
                    },
                    { id:14,
                      value:"What is your favorite food",
                      answers: [
                          {id:21, value:"pizza"},
                          {id:18, value:"cake"},
                          {id:12, value:"brains"}
                      ]
                    }
                ]
              };
    callback(null, res);
    return;
};

var getSurveyResults = function (surveyData, callback) {
    // surveyData = {'surveyId':34}
    // callback needs to expect callback(err, responses)
    var surveyId = surveyData['surveyId'];
    logger.info("Getting survey results from database for surveyId", surveyId);

    var queryString = "SELECT v.answerId, COUNT(*) \
                       FROM survey AS s \
                           INNER JOIN question AS q ON s.id = q.surveyId AND s.id = $1 \
                           INNER JOIN vote AS v ON q.id = v.questionId \
                       GROUP BY v.answerId \
                       ORDER BY v.answerId";

    runQuery(queryString, [surveyId])
    .then(function (results) {
        var ret = {};
        for (var r=0; r<results.rowCount; r++) {
            var answerId = results.rows[r].answerid;
            ret[answerId] = results.rows[r].count;
        }
        logger.info("Got survey results from database for surveyId", surveyId);
        callback(null, ret);
        return;
    })
    .fail(function (error) {
        logger.error("Error getting survey results", error);
        callback(error);
        return;
    });
};

var createSurvey = function (surveyData, callback) {
    // surveyData = { 'title':'"Because clickers are SO 1999."', 
    //                'questions': [{'question': 'Which is best?', 'answers': ["Puppies", "Cheese", "Joss Whedon", "Naps"]}],
    //                'password':'supersecretpassword' }
    //
    // callback(err, result), where 
    // result = {'surveyId':'xxx'}
    var title = surveyData['title'];
    var questions = surveyData['questions'];
    var password = surveyData['password'];

    logger.info("Inserting new survey into database...");
    runQuery("INSERT INTO survey(title, password) VALUES($1, $2) RETURNING *", [title, password])
    .then(function (result) {
        // insert the new survey (return the survey ID to use in inserting questions)
        logger.info("Inserted survey. New survey ID is", result.rows[0].id);
        return result.rows[0].id;
    })

    .then(function (sid) {
        // insert all the questions for this survey
        for (var q=0; q<questions.length; q++) {
            var question = questions[q];
            var value = question['question'];
            var answers = question['answers'];
            runQuery("INSERT INTO question(surveyid, value) VALUES($1, $2) RETURNING *", [sid, value])

            .then(function (result) {
                // insert all the answers for this question
                var qid = result.rows[0].id;
                for (var a=0; a<answers.length; a++) {
                    var answer = answers[a];
                    runQuery("INSERT INTO answer(questionid, value) VALUES($1, $2)", [qid, answer])
                }
            });
        }
        return sid;
    })

    .then(function (surveyId) {
              logger.info("All questions and answers inserted");
              callback(null, {"surveyId": surveyId});
              return;
    })
    .fail(function (error) {
              logger.error("Error creating survey.", error);
              callback(error);
              return;
    })
};


exports.recordVote = recordVote;
exports.getSurveyResults = getSurveyResults;
exports.getSurveyInfo = getSurveyInfo;
exports.createSurvey = createSurvey;


// ==================================================================================================
// local scope, don't export
// ==================================================================================================

var runQuery = function (queryString, values) {
    var deferred = Q.defer();
    pg.connect(CONNSTRING, function (err, client, done) {
        if (err) {
            err["friendlyName"] = "Database connection error";
            logger.error("Database connection error in runQuery", err);
            deferred.reject(err);
        }

        else {
            client.query(queryString, values, function (err, results) {
                done(); // called to release the connection client into the pool
                if (err) {
                    err["friendlyName"] = "Query error";
                    logger.error("Query error in runQuery", err);
                    deferred.reject(err);
                }
                else {
                    deferred.resolve(results);
                }
            });
        }
    });
    return deferred.promise;
};

