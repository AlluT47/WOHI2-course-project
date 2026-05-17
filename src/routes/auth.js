const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { z } = require("zod");
const { ValidationError, ConflictError, UnauthorizedError } = require("../lib/error");

const SECRET = process.env.JWT_SECRET;


const RegisterInput = z.object({
  email: z.string().min(1).max(255),
  password: z.string().min(1).max(72),
  name: z.string().min(1).max(100), 
});


const LoginInput = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})


// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password, name } = RegisterInput.parse(req.body);

  const existingUser = await prisma.user.findUnique({ where: { email },});
    if (existingUser) {
        throw new ConflictError("Email already registered");
    }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
        data: { email, password: hashedPassword, name },
    });

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h", algorithm: "HS256", });

  res.status(201).json({
        message: "User registered succefully",
        token,
    });
});


// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = LoginInput.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email }, });
  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "1h", algorithm: "HS256", });

  res.json({ token });
});


module.exports = router;