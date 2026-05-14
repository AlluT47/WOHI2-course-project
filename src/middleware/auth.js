const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;
const { UnauthorizedError, ForbiddenError } = require("../lib/error");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided");
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    next();
  } catch {
    throw new ForbiddenError("Invalid or expired token")
  }
}

module.exports = authenticate;