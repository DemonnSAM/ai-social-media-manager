import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/Routes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

// Health check route
app.get('/', (req, res) => {
    res.json({ message: 'API is running 🚀' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
