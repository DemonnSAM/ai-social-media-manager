import express from "express";
import supabase from "../config/supabase.js";

const router = express.Router();

router.get("/db-test", async (req, res) => {

    const { data, error } = await supabase
        .from("users")
        .select("*");

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});

router.post("/create-user", async (req, res) => {

    const { name, email } = req.body

    const { data, error } = await supabase
        .from("users")
        .insert([{ name, email }])
        .select()

    if (error) return res.status(500).json(error)

    res.json(data)

})

export default router;