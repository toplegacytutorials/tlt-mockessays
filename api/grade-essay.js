export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;
    
    // Your Mistral key
    const apiKey = "mstrl_jUVKTm7uzfHyGpiELlX2rlhxpcFC0ubB_4az0F1";

    let totalMarks = 10; 
    let markingScheme = "";

    if (examId === 'carotid_triangle') {
        totalMarks = 10;
        markingScheme = `Discuss boundaries/contents of the Carotid Triangle. Boundaries: Superior belly of omohyoid, posterior belly of digastric, anterior border of SCM. Contents: Common carotid artery, internal jugular vein, vagus nerve, ansa cervicalis, hypoglossal nerve.`;
    } else if (examId === 'neuro_corticospinal') {
        totalMarks = 15;
        markingScheme = `Discuss pathways of the corticospinal tract. Origin: Motor cortex. Pathway: Internal capsule, crus cerebri, pons, medulla. Decussation: Pyramidal decussation. Lesions: UMN vs LMN signs.`;
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

    // Structured prompt for JSON output
    const systemPrompt = `You are a strict Anatomy Examiner grading a handwritten essay. 
    Read the text from the images and compare it strictly to this Marking Scheme:
    ${markingScheme}
    
    You must reply with ONLY a valid JSON object, without any markdown formatting or backticks. The JSON must have exactly this structure:
    {
        "score": [integer score out of ${totalMarks}],
        "correct": ["List of things the student got right"],
        "missed": ["List of things the student missed"],
        "advice": "One short sentence of exam advice"
    }`;

    const url = `https://api.mistral.ai/v1/chat/completions`;

    try {
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
                model: "pixtral-12b-2409",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: systemPrompt },
                            ...imageParts
                        ]
                    }
                ],
                temperature: 0, // <--- FIXED: Makes scoring deterministic
                response_format: { type: "json_object" } // Forces JSON
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
        
        // Parse the JSON
        let parsedFeedback;
        try {
            parsedFeedback = JSON.parse(responseText);
        } catch (e) {
            // Fallback if it fails to parse
            return res.status(500).json({ error: "Failed to parse AI response." });
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
