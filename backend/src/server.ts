import "dotenv/config";
import cors from "cors";
import express from "express";
import { templatesRouter } from "./routes/templates.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "*";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/templates", templatesRouter);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
