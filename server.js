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

// Proxy route for secure Weather API calls
app.get("/api/weather", async (req, res) => {
    try {
        let query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: "Query parameter 'q' is required" });
        }

        // Resolve real client IP local fallback
        if (query === 'auto:ip') {
            const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress;
            if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
                query = clientIp.split(',')[0].trim();
            }
        }

        const apiKey = process.env.WEATHER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "WEATHER_API_KEY is not configured in .env" });
        }

        const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(query)}&aqi=no`);
        
        if (!response.ok) {
            const errData = await response.json();
            return res.status(response.status).json({ 
                error: (errData.error && errData.error.message) || "Failed to fetch weather from provider" 
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Local weather request error:", error);
        res.status(500).json({
            error: error.message || "Failed to process weather request"
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
