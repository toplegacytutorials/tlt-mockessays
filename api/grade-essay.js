export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;
    
    // Your Mistral key is hardcoded here
    const apiKey = "mstrl_jUVKTm7uzfHyGpiELlX2rlhxpcFC0ubB_4az0F1";

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

    const url = `https://api.mistral.ai/v1/chat/completions`;

    try {
        // Mistral supports up to 8 images per request.
        const imageParts = images.slice(0, 8).map(img => ({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${img}` }
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "pixtral-12b-2409", // Mistral's fast, free vision model
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: systemPrompt },
                            ...imageParts
                        ]
                    }
                ],
                temperature: 0.1 
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: `Mistral API Error: ${data.error.message}` });
        }
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({ error: "Mistral failed to read the images." });
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
