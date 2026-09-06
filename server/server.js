const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "시세봄 서버 정상 작동"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`시세봄 서버 실행 중: http://localhost:${PORT}`);
});