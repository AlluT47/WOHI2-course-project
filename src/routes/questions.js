const express = require("express");
const router = express.Router();

const questions = require("../data/questions");

// GET /api/questions/, /api/questions?answer=Stockholm
router.get("/", (req, res) => {
    const {answer} = req.query;
    
    if(!answer) {
        res.json(questions);
    }
    
    const filterQuestions = questions.filter(q => q.answer.includes(answer));
    res.json(filterQuestions);
});

// GET /api/questions/:questionId
router.get("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = questions.find(q => q.id === questionId);
    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }

    res.json(question);
});

// POST /api/questions
router.post("/", (req, res) => {
    const {question, answer} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "Question and answer are required"})
    }
    
    const maxId = Math.max(...questions.map(q => q.id), 0);

    const newQuestion = {
        id: questions.length ? maxId + 1 : 1,
        question,
        answer,
    };
    questions.push(newQuestion);

    res.status(201).json(newQuestion);
});

// PUT /api/questions/:questionId
router.put("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const questionConstents = questions.find(q => q.id === questionId);
    if (!questionConstents) {
        return res.status(404).json({msg: "Question not found"});
    }

    const {question, answer} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "Question and answer are required"})
    }

    questionConstents.question = question;
    questionConstents.answer = answer;

    res.json(questionConstents);
});

// DELETE /api/questions/:questionId
router.delete("/:questionId", (req, res) => {
    const questionId = Number(req.params.questionId);
    const questionIndex = questions.findIndex(q => q.id === questionId);

    if (questionIndex === -1) {
        return res.status(404).json({msg: "Question not found"})
    }

    const deleteQuestion = questions.splice(questionIndex, 1);

    res.json({
        msg: "Question deleted successfully",
        question: deleteQuestion
    });
});

module.exports = router;