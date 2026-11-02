export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;
    
    // Your key is hardcoded right here. No Vercel environment variables needed.
    const apiKey = "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";

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

    const url = `https://api.groq.com/openai/v1/chat/completions`;

    try {
        const imageMessages = images.map(img => ({
            type: "image_url",
            image_url: {
                url: `data:${mimeType};base64,${img}`
            }
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                // --- UPDATED MODEL NAME HERE ---
                model: "qwen/qwen3.8-27b", 
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: systemPrompt },
                            ...imageMessages
                        ]
                    }
                ],
                temperature: 0.1 
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: `Groq API Error: ${data.error.message}` });
        }
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({ error: "Groq failed to read the image." });
        }

        const responseText = data.choices[0].message.content;
        
        const scoreMatch = responseText.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
        let score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

        return res.status(200).json({ feedback: responseText, score, total: totalMarks });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: `Server Error: ${error.message}` });
    }
}
