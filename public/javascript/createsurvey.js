// GOBAL PAGE VARIABLES //
pageTitle = "Create Survey";

function removeAnswer(el) {
    var target = $(el);
    var answerDiv = target.parent();

    answerDiv.remove();
}

function addAnswer(el) {
    // find the question, add another answer option
    var answerHtml = '<div class="answer">' +
        '  Answer Choice: <input type="text" class="answer-text" size="30"/> ' +
        '  <button type="button" class="remove-answer-button pure-button pure-button-error" onclick="removeAnswer(this);">&#10006;</button><br>' +
        '</div>';

    var target = $(el); // this will be the + button (with name=question-%questionId%)
    var answersDiv = target.siblings(".answers");
    answersDiv.append(answerHtml);

}

function removeQuestion(el) {
    var target = $(el);
    var questionDiv = target.parent();

    questionDiv.remove();
}

function createQuestion(type) {
    var questionHtml = '<div class="question rounded ' + type + '" data-question-type="'+type+'">' +
        '  <button type="button" class="remove-question-button pure-button pure-button-error" onclick="removeQuestion(this);"><span>&#10006;</span></button> ' +
        '  Question: <input type="text" size="40" class="question-text" /> <br>' +
        '  <div class="answers">' +
        '    <div class="answer">' +
        '      Answer Choice: <input type="text" class="answer-text" size="30" />' +
        '     <button type="button" class="remove-answer-button pure-button pure-button-error" onclick="removeAnswer(this);"<span>&#10006;</span></button><br>' +
        '    </div>' +
        '  </div>' +
        '  <button type="button" class="add-answer-button pure-button pure-button-success pure-button-small" onclick="addAnswer(this);"><span>&#10133;</span></button>' +
        '</div>';

    $(".questions").append(questionHtml);
}

$(document).ready(function () {
    $('[name="createSurvey"]').click(function (event) {
        var title = $("#title").val();
        var password = $("#adminPwd").val();

        var questions = [];
        var mcQuestions = $(".questions").find(".question");
        $.each(mcQuestions, function (i, val) {
            var el = $(val);
            var answerList = [];
            var questionText = el.find(".question-text").val();
            var questionType = el.attr("data-question-type");

            var answers = el.find(".answer-text");
            $.each(answers, function (idx, v) {
                var answerText = $(v).val();
                answerList.push(answerText);
            });

            var question = {"question":questionText, "type":questionType, "answers":answerList};
            questions.push(question);
        });

        var data = {"title":title, "questions":questions, "password": password};
        var jsonData = JSON.stringify(data);
        $.ajax({
            type: "POST",
            url: "/createSurvey",
            data: jsonData,
            contentType: 'application/json',
            success: function (data) {
               shareSurvey(data["surveyId"])
            },
            error: function (data) {
               console.log(data);
            }
        });
        event.preventDefault();

        return false;
    });

    function shareSurvey(id) {
        var takesurveyLink = "/?p=takesurvey&survey=" + id;
        var adminsurveyLink = "/?p=results&survey=" + id;

        var takesurvey = "<br> To take your survey go to " +
                         "<a href='" + takesurveyLink + "'>" +
                         "TapVote.com" + takesurveyLink + "</a><br>";

        var adminsurvey = "To view the results of your survey go to " +
                          "<a href='" + adminsurveyLink + "'>" +
                          "TapVote.com" + adminsurveyLink + "</a><br>";

        $("#new-survey-links").html(takesurvey + adminsurvey);

    }
});
