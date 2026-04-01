const express = require("express");

const app = express();
const questionsRouter = require("./routes/questions");
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/questions", questionsRouter);

app.use((req, res) => {
    res.status(404).json({msg: "Not Found"})
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});