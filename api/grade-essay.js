export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;
    
    // Your hardcoded key
    const apiKey = "AQ.Ab8RN6LGW7l5R5b2Ic5oNsUmYmW9eJR7mQ_SUHk4llBC2hAXjQ";

    let totalMarks = 10; 
    let markingScheme = "";

    if (examId === 'carotid_triangle') {
        totalMarks = 10;
        markingScheme = `Discuss boundaries/contents of the Carotid Triangle.`;
    } else if (examId === 'neuro_corticospinal') {
        totalMarks = 15;
        markingScheme = `Discuss pathways of the corticospinal tract.`;
    } else {
        return res.status(400).json({ error: 'Invalid Exam ID' });
    }

    if (autoZero) {
        return res.status(200).json({
            feedback: "Time expired or exam left. Score: 0.",
            score: 0,
            total: totalMarks
        });
    }

    if (!images || images.length === 0) {
        return res.status(400).json({ error: 'Missing images' });
    }

    const systemPrompt = `Grade this handwritten essay based on: ${markingScheme}.
    Output EXACTLY this format and nothing else:
    SCORE: [X]/${totalMarks}
    FEEDBACK: [One short sentence summarizing what they missed.]`;

    // Notice we removed the ?key= from the URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`;

    try {
        const imageParts = images.map(img => ({
            inline_data: { mime_type: mimeType, data: img }
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey // <--- THE KEY IS NOW IN THE HEADER
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }, ...imageParts] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: `Google API Error: ${data.error.message}` });
        }
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            return res.status(500).json({ error: "Gemini failed to read the image." });
        }

        const responseText = data.candidates[0].content.parts[0].text;
        
        const scoreMatch = responseText.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
        let score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

        return res.status(200).json({ feedback: responseText, score, total: totalMarks });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: `Server Error: ${error.message}` });
    }
}
