const Groq = require("groq-sdk");

module.exports = async (req, res) => {
    // CORS Headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Safely check for the API key to prevent cold-start crashes
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ 
            error: "GROQ_API_KEY is not configured in Vercel project environment variables." 
        });
    }

    try {
        const systemPrompt = req.body.systemPrompt || "You are a helpful assistant.";
        const userPrompt = req.body.userPrompt;

        if (!userPrompt) {
            return res.status(400).json({ error: "userPrompt is required" });
        }

        // Instantiate Groq inside the handler scope
        const groq = new Groq({ apiKey: apiKey });

        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 512
        });

        res.status(200).json({
            reply: response.choices[0].message.content
        });
    } catch (error) {
        console.error("Vercel Groq Handler Error:", error);
        res.status(500).json({
            error: error.message || "AI request failed"
        });
    }
};
