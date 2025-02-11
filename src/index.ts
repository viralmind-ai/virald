import express from "express";
import { registerWithServer } from "./client";

const app = express();
const port = process.env.PORT || 9090;

app.use(express.json());

registerWithServer();

app.listen(port, () => {
  console.log(`virald node running on port ${port}`);
});
