export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;
    
    // This pulls your saved OpenRouter key from Vercel
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'OpenRouter API Key is missing in Vercel settings.' });
    }

    let totalMarks = 10; 
    let markingScheme = "";

    if (examId === 'carotid_triangle') {
        totalMarks = 10;
        markingScheme = `
        Question: Discuss the boundaries and contents of the Carotid Triangle.
        
        Marking Scheme (Total 10 marks):
        1. Boundaries (3 marks): Superior (Posterior belly of Digastric/Stylohyoid), Posterior (Anterior border of SCM), Inferior (Superior belly of Omohyoid).
        2. Contents (5 marks): Arterial (CCA/ICA/ECA), Venous (IJV), Nerves (Vagus, Hypoglossal, Spinal Accessory, Ansa Cervicalis, Sympathetic Trunk), Lymphatics.
        3. Diagram (2 marks): 
           - A hand-drawn diagram is present in the student's work.
           - RULE FOR DIAGRAM: If ANY drawing of the neck/triangle is present, and the student has listed the muscles (Digastric, Omohyoid, SCM, Stylohyoid) anywhere on the page, you MUST award the full 2/2 marks. 
        
        RULES: Do not penalize for extra info.`;

    } else if (examId === 'neuro_corticospinal') {
        totalMarks = 15;
        markingScheme = `Discuss pathways of the corticospinal tract. Origin (3 marks), Pathway (6 marks), Decussation (2 marks), Lesions (4 marks).`;
    } else {
        return res.status(400).json({ error: 'Invalid Exam ID' });
    }

    if (autoZero) {
        return res.status(200).json({
            feedback: { score: 0, breakdown: [{section: "Exam", score: "0/10", feedback: "Time expired or exam left."}], missed: ["Entire exam"], advice: "Complete the exam next time." },
            score: 0,
            total: totalMarks
        });
    }

    if (!images || images.length === 0) {
        return res.status(400).json({ error: 'Missing images' });
    }

    const systemPrompt = `You are an Anatomy Examiner grading a handwritten essay. 
    Read the text from the images and compare it to this Marking Scheme:
    ${markingScheme}
    
    You must reply with ONLY a valid JSON object, without any markdown formatting or backticks. The JSON must have exactly this structure:
    {
        "score": [integer total score out of ${totalMarks}],
        "breakdown": [
            { "section": "Boundaries", "score": "[X]/3", "feedback": "Briefly say what they got right or wrong here." },
            { "section": "Contents", "score": "[X]/5", "feedback": "Briefly say what they got right or wrong here." },
            { "section": "Diagram", "score": "[X]/2", "feedback": "Briefly say if the diagram is present and labeled." }
        ],
        "missed": ["List any specific missing keywords, or write 'Nothing missed'"],
        "advice": "One short sentence of exam advice"
    }

    CRITICAL MATH RULE: The "score" at the top MUST be the exact mathematical sum of the scores in the "breakdown" array.`;

    const url = `https://openrouter.ai/api/v1/chat/completions`;

    try {
        const imageParts = images.slice(0, 8).map(img => ({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${img}` }
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://tlt-mockessays.vercel.app',
                'X-Title': 'TLT Mock Essays'
            },
            body: JSON.stringify({
                // UPDATED MODEL ID
                model: "qwen/qwen2.5-vl-72b-instruct:free",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: systemPrompt },
                            ...imageParts
                        ]
                    }
                ],
                temperature: 0,
                response_format: { type: "json_object" } 
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: `OpenRouter API Error: ${data.error.message || data.error}` });
        }
        
        if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
            return res.status(500).json({ error: "No valid response from OpenRouter. Please try again." });
        }

        const responseText = data.choices[0].message.content;
        
        let parsedFeedback;
        try {
            parsedFeedback = JSON.parse(responseText);
        } catch (e) {
            return res.status(500).json({ error: "Failed to parse AI response. " + responseText });
        }

        return res.status(200).json({ 
            feedback: parsedFeedback, 
            score: parsedFeedback.score, 
            total: totalMarks 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: `Server Error: ${error.message}` });
    }
}
