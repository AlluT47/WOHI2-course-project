const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");


function formatQuestion(quiz) {
  return {
    ...quiz,
    keywords: quiz.keywords.map((k) => k.name),
  };
}


router.use(authenticate);


// GET /api/questions/, /api/questions?answer=Stockholm
router.get("/", async (req, res) => {
    const { keyword } = req.query;

    const where = keyword
        ? { keywords: { some: { name: keyword } } }
        : {};

        const filteredQuestions = await prisma.quiz.findMany({
            where,
            include: { keywords: true },
            orderBy: {id: "asc"},
        })

    res.json(filteredQuestions.map(formatQuestion));
});


// GET /api/questions/:questionId
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.quiz.findUnique({
        where: { id: questionId},
        include: { keywords: true},
    });

    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }

    res.json(formatQuestion(question));
});


// POST /api/questions
router.post("/", async (req, res) => {
    const {question, answer, keywords} = req.body;
    
    if (!question || !answer) {
        return res.status(400).json({msg: "Question and answer are required"})
    }
    
    const keywordsArray = Array.isArray(keywords) ? keywords : [];

    const newQuestion = await prisma.quiz.create({
        data: {
            question,
            answer,
            userId: req.user.userId,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw }, create: { name: kw },
                })),
            },
        },
        include: { keywords: true },
    });

    res.status(201).json(formatQuestion(newQuestion));
});


// PUT /api/questions/:questionId
router.put("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { question, answer, keywords } = req.body;
    const existingQuestion = await prisma.quiz.findUnique({ where: { id: questionId } });
    
    if (!existingQuestion) {
        return res.status(404).json({msg: "Question not found"});
    }

    if (!question || !answer) {
        return res.status(400).json({msg: "Question and answer are required"})
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updateQuestion = await prisma.quiz.update({
        where: { id: questionId },
        data: {
            question,
            answer,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw }, create: { name: kw },
                })),
            },
        },
        include: { keywords: true },
    });
    res.json(formatQuestion(updateQuestion));
});


// DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.quiz.findUnique({
        where: { id: questionId},
        include: { keywords: true},
    });

    if (!question) {
        return res.status(404).json({msg: "Question not found"})
    }

    await prisma.quiz.delete({ where: { id: questionId } });

    res.json({
        msg: "Question deleted successfully",
        question: formatQuestion(question),
    });
});

module.exports = router;