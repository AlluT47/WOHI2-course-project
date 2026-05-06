const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const path = require("path");
const multer = require("multer");


const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "public", "uploads"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
});


const uploads = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files are allowed"));
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});


function parseKeywords(keywords) {
    if (Array.isArray(keywords)) return keywords;
    if (typeof keywords === "string") {
        return keywords.split(",").map((k) => k.trim()).filter(Boolean);
    }
    return [];
}


function formatQuestion(quiz) {
  return {
    ...quiz,
    keywords: quiz.keywords.map((k) => k.name),
    userName: quiz.user ? quiz.user.name : null,
    imageUrl: quiz.imageUrl,
    solvedCount: quiz._count?.solved ?? 0,
    solved: !!quiz.solved?.length,
    user: undefined,
    _count: undefined,
  };
}


router.use(authenticate);


// GET /api/questions/, /api/questions?keyword=History&page=1&limit=5
router.get("/", async (req, res) => {
    const { keyword } = req.query;

    const where = keyword
        ? { keywords: { some: { name: keyword } } }
        : {};

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    const [filteredQuestions, total] = await Promise.all([
        prisma.quiz.findMany({
            where,
            include: { 
                keywords: true, 
                user: true,
                solved: { where: { userId: req.user.userId }, take: 1 },
                _count: { select: { solved: true } },
            },
            orderBy: {id: "asc"},
            skip,
            take: limit
        }),
        prisma.quiz.count({ where }),
    ]);

    res.json({
        data: filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});


// GET /api/questions/:questionId
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const question = await prisma.quiz.findUnique({
        where: { id: questionId},
        include: { 
                keywords: true, 
                user: true,
                solved: { where: { userId: req.user.userId }, take: 1 },
                _count: { select: { solved: true } },
            },
    });

    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }

    res.json(formatQuestion(question));
});


// POST /api/questions
router.post("/", uploads.single("image"), async (req, res) => {
    const {question, answer, keywords} = req.body;
    
    if (!question || !answer) {
        return res.status(400).json({msg: "Question and answer are required"})
    }
    
    const keywordsArray = parseKeywords(keywords);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;


    const newQuestion = await prisma.quiz.create({
        data: {
            question,
            answer,
            imageUrl,
            userId: req.user.userId,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw }, create: { name: kw },
                })),
            },
        },
        include: { keywords: true, user: true },
    });

    res.status(201).json(formatQuestion(newQuestion));
});


// PUT /api/questions/:questionId
router.put("/:questionId", isOwner, uploads.single("image"), async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { question, answer, keywords } = req.body;
    const existingQuestion = await prisma.quiz.findUnique({ where: { id: questionId } });
    
    if (!existingQuestion) {
        return res.status(404).json({msg: "Question not found"});
    }

    if (!question || !answer) {
        return res.status(400).json({msg: "Question and answer are required"})
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const keywordsArray = parseKeywords(keywords);
    
    const updateQuestion = await prisma.quiz.update({
        where: { id: questionId },
        data: {
            question,
            answer,
            imageUrl,
            keywords: {
                set: [],
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw }, 
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true, user: true },
    });
    res.json(formatQuestion(updateQuestion));
});


// DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.quiz.findUnique({
        where: { id: questionId},
        include: { keywords: true, user: true },
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

// POST /api/questions/:questionId/play
router.post("/:questionId/play", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const { answer } = req.body;

    const question = await prisma.quiz.findUnique({ where: { id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "question not found" });
    }

    const isCorrect = question.answer.trim().toLowerCase() === (answer || "").trim().toLowerCase();

    let solved = null;

    if (isCorrect) {
        solved = await prisma.solved.upsert({
            where: { userId_questionId: { userId: req.user.userId, questionId } },
            update: {},
            create: { userId: req.user.userId, questionId },
        });
    }

    const solvedCount = await prisma.solved.count({ where: { questionId } });

    res.status(201).json({
        id: solved ? solved.id : null,
        questionId,
        correct: isCorrect,
        correctAnswer: question.answer,
        solved: isCorrect,
        solvedCount,
    });
});

// DELETE /api/questions/:questionId/solved
router.delete("/:questionId/solved", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.quiz.findUnique({ where: { id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "question not found" });
    }

    await prisma.solved.deleteMany({
        where: { userId: req.user.userId, questionId },
    });

    const solvedCount = await prisma.solved.count({ where: { questionId } });

    res.json({ 
        questionId, 
        solved: false, 
        solvedCount 
    });
});


router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err?.message === "Only image files are allowed") {
        return res.status(400).json({ msg: err.message });
    }
    next(err);
});


module.exports = router;