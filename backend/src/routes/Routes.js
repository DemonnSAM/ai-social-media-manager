import express from "express";
import supabase from "../config/supabase.js";
import authRoutes from "./authRoutes.js";
import postRoutes from "./postRoutes.js";
import socialRoutes from "./socialRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";
import aiRoutes from "./aiRoutes.js";

const router = express.Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/posts", postRoutes);
router.use("/social", socialRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/ai", aiRoutes);

// Health check / DB test
router.get("/db-test", async (req, res) => {
    // Note: old 'users' table is dropped, testing 'profiles' instead
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .limit(1);

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});

export default router;