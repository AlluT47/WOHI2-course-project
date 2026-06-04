const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const path = require("path");
const multer = require("multer");
const { NotFoundError, ValidationError } = require("../lib/error");
const { z, promise } = require("zod");
const { title } = require("process");
const { count } = require("console");


const QuestionInput = z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    multipleChoice: z.array(z.string()).min(2),
    keywords: z.union([z.string(), z.array(z.string())]).optional(),
});


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
        else cb(new ValidationError("Only image files are allowed"));
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
    multipleChoice: quiz.multipleChoice || [],
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


// Get /api/questions/leaderboard
router.get("/leaderboard", async (req, res) => {
    const leaderboard = await prisma.solved.groupBy({
        by: ["userId"],
        _count: {
            id: true
        },
        orderBy: {
            _count: {
                id: "desc"
            }
        },
        take: 10
    });

    const users = await Promise.all(
        leaderboard.map(async (ranking) => {
            const user = await prisma.user.findUnique({
                where: { id: ranking.userId },
                select: { id: true, name: true }
            });

            if (!user) return null;

            return {
                userId: user.id,
                userName: user.name,
                solvedCount: ranking._count.id
            };
        })
    );

    res.json(users.filter(Boolean));
});


// GET /api/questions/:questionId
router.get("/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(questionId) || questionId <= 0) {
        throw new NotFoundError("Question not found")
    }

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
        throw new NotFoundError("Question not found");
    }

    res.json(formatQuestion(question));
});


// POST /api/questions
router.post("/", uploads.single("image"), async (req, res) => {
    //console.log("BODY:", req.body);
    //console.log("FILE:", req.file);

    const parsedbody = {...req.body, multipleChoice: JSON.parse(req.body.multipleChoice)};

    const { question, answer, multipleChoice, keywords } = QuestionInput.parse(parsedbody);

    const keywordsArray = parseKeywords(keywords);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newQuestion = await prisma.quiz.create({
        data: {
            question,
            answer,
            multipleChoice,
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
    const parsedbody = {...req.body, multipleChoice: JSON.parse(req.body.multipleChoice)};

    const { question, answer, multipleChoice, keywords } = QuestionInput.parse(parsedbody);

    const keywordsArray = parseKeywords(keywords);

    const data = {
        question,
        answer,
        multipleChoice,
        keywords: {
            set: [],
            connectOrCreate: keywordsArray.map((kw) => ({
                where: { name: kw },
                create: { name: kw },
            })),
        },
    };
    if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;
    
    const updateQuestion = await prisma.quiz.update({
        where: { id: questionId },
        data,
        include: { keywords: true, user: true },
    });
    res.json(formatQuestion(updateQuestion));
});


// POST /api/questions/:questionId/play
router.post("/:questionId/play", async (req, res) => {
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(questionId) || questionId <= 0) {
        throw new NotFoundError("Question not found");
    }

    const { selectedChoice } = req.body;

    const question = await prisma.quiz.findUnique({ where: { id: questionId } });
    if (!question) {
        throw new NotFoundError("Question not found");
    }

    const isCorrect = question.answer.trim().toLowerCase() === (selectedChoice || "").trim().toLowerCase();

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
        throw new NotFoundError("Question not found");
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


// DELETE /api/questions/:questionId
router.delete("/:questionId", isOwner, async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.quiz.findUnique({
        where: { id: questionId},
        include: { keywords: true, user: true },
    });

    if (!question) {
        throw new NotFoundError("Question not found");
    }

    await prisma.solved.deleteMany({ where: { questionId: questionId } });

    await prisma.quiz.delete({ where: { id: questionId } });

    res.json({
        msg: "Question deleted successfully",
        question: formatQuestion(question),
    });
});


router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err?.message === "Only image files are allowed") {
        throw new ValidationError({ message: err.message });
    }
    next(err);
});


module.exports = router;