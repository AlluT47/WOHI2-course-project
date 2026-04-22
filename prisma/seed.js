const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedQuestions = [
    {
        question: "Where was gunpowder first invented?",
        answer: "Gunpowder was first invented in China during the mid-9th century.",
        keywords: ["History"]
    },
    {
        question: "What is the tallest builing in the world?",
        answer: "The tallest building in the world is the Burj Khalifa which is 828-meters-tall.",
        keywords: ["Monuments"]
    },
    {
        question: "What is the capital of Sweden?",
        answer: "The capital of Sweden is the city of Stockholm.",
        keywords: ["Geography"]
    },
    {
        question: "Where does Stockholm syndrome get it's name from?",
        answer: "Stockholm syndrom is named after a tha bank robbery of Kreditbanken in Stockholm in 1973.",
        keywords: ["History"]
    }
];

async function main() {
  await prisma.quiz.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("Create user:", user.email);

  for (const question of seedQuestions) {
    await prisma.quiz.create({
      data: {
        question: question.question,
        answer: question.answer,
        userId: user.id,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw }
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());