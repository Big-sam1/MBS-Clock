require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from the root directory
app.use(express.static(path.join(__dirname)));

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Proxy route for secure Groq AI calls
app.post("/api/chat", async (req, res) => {
    try {
        const systemPrompt = req.body.systemPrompt || "You are a helpful assistant.";
        const userPrompt = req.body.userPrompt;

        if (!userPrompt) {
            return res.status(400).json({ error: "userPrompt is required" });
        }

        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 512
        });

        res.json({
            reply: response.choices[0].message.content
        });
    } catch (error) {
        console.error("Groq backend request error:", error);
        res.status(500).json({
            error: error.message || "AI request failed"
        });
    }
});

// Handle SPA routing fallbacks if needed (always serve index.html for undefined GET routes)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Smart Alarm Pro Server is running!`);
    console.log(`Access the application at: http://localhost:${PORT}/`);
    console.log(`Press Ctrl+C to terminate the server.`);
});
