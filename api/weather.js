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

    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: "Missing query parameter 'q'" });
    }

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ 
            error: "WEATHER_API_KEY is not configured in Vercel project environment variables." 
        });
    }

    try {
        // Use Node.js native fetch API
        const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(query)}&aqi=no`);
        
        if (!response.ok) {
            const errData = await response.json();
            return res.status(response.status).json({ 
                error: (errData.error && errData.error.message) || "Failed to fetch weather from provider" 
            });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Vercel Weather Handler Error:", error);
        res.status(500).json({
            error: error.message || "Failed to process weather request"
        });
    }
};
