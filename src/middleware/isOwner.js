const prisma = require("../lib/prisma");

async function isOwner (req, res, next) {
    const id = Number(req.params.questionId);
    const question = await prisma.quiz.findUnique({
      where: { id },
      include: { keywords: true },
    });

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    if (question.userId !== req.user.userId) {
      throw new ForbiddenError("You can only edit and delete your own questions");
    }

    req.question = question;
    next();
  
}

module.exports = isOwner;