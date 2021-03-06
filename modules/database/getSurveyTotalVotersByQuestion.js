var Q = require("q");
var runQuery = require("./runQuery").runQuery;


var getSurveyTotalVotersByQuestion = function (surveyData, callback) {
    // surveyData = {'surveyId':34}
    // callback needs to expect callback(err, responses)
    var surveyId = surveyData['surveyId'];
    logger.info("Getting survey total voters from database for surveyId", surveyId);

    var queryString = 'SELECT questionUserVotes."questionId", COUNT(questionUserVotes."userId") \
                       FROM ( \
                           SELECT DISTINCT q.id AS "questionId", v."userId" \
                           FROM survey AS s \
                           INNER JOIN question AS q ON s.id = q."surveyId" AND s.id = $1 \
                           LEFT JOIN answer AS a ON q.id = a."questionId" \
                           LEFT JOIN vote AS v ON a.id = v."answerId" \
                       ) AS questionUserVotes \
                       GROUP BY questionUserVotes."questionId" \
                       ORDER BY questionUserVotes."questionId";';

    runQuery(queryString, [surveyId])
        .then(function (results) {
            if(results.rowCount == 0) {
                // either there are simply no questions for this survey, or this survey ID is non-existent

                // check if survey exists
                return runQuery("SELECT * FROM survey WHERE id=$1", [surveyId])
                .then(function (res) {
                    if(res.rowCount == 0) {
                        // survey doesn't exist, throw 404
                        logger.error("Attempt to get survey total voters by question for non-existent survey ID");
                        var err = Error();
                        err['httpStatus'] = 404;
                        err['httpResponse'] = "404 Not Found";
                        err['friendlyName'] = "Non-existent survey ID";
                        throw err;
                    }
                    return results;
                });
            } else {
              return results;
            }
        })
        .then(function (results) {
            var ret = {};
            for (var r=0; r<results.rowCount; r++) {
              var questionId = results.rows[r].questionId;
              ret[questionId] = parseInt(results.rows[r].count);
            }
            logger.info("Got survey total voters by question from database for surveyId", surveyId);
            callback(null, ret);
            return;
        })
        .fail(function (error) {
            logger.error("Error getting survey total voters by question", error);
            callback(error);
            return;
        });
};


exports.getSurveyTotalVotersByQuestion = getSurveyTotalVotersByQuestion;
