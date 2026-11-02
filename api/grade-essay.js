export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;
    
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'OpenRouter API Key is missing in Vercel settings.' });
    }

    let totalMarks = 10; 
    let markingScheme = "";

    // NOTE: You can now put ANY marking scheme structure here, and the AI will adapt.
    if (examId === 'carotid_triangle') {
        totalMarks = 10;
        markingScheme = `
        Question: Discuss the boundaries and contents of the Carotid Triangle.
        Marking Scheme (Total 10 marks):
        1. Boundaries (3 marks): Superior (Posterior belly of Digastric/Stylohyoid), Posterior (Anterior border of SCM), Inferior (Superior belly of Omohyoid).
        2. Contents (5 marks): Arterial (CCA/ICA/ECA), Venous (IJV), Nerves (Vagus, Hypoglossal, Spinal Accessory, Ansa Cervicalis, Sympathetic Trunk), Lymphatics.
        3. Diagram (2 marks): Hand-drawn diagram present with labels.
        RULES: Do not penalize for extra info.`;
    } else if (examId === 'neuro_corticospinal') {
        totalMarks = 15;
        markingScheme = `
        Question: Discuss the pathways of the corticospinal tract.
        Marking Scheme (Total 15 marks):
        1. Origin (3 marks): Motor cortex.
        2. Pathway (6 marks): Internal capsule, crus cerebri, pons, medulla.
        3. Decussation (2 marks): Pyramidal decussation in medulla.
        4. Lesions (4 marks): UMN vs LMN signs.`;
    } else {
        return res.status(400).json({ error: 'Invalid Exam ID' });
    }

    if (autoZero) {
        return res.status(200).json({
            feedback: { score: 0, breakdown: [{section: "Exam", score: "0/10", rationale: "Time expired or exam left."}], overallRationale: "Exam not completed.", advice: "Complete the exam next time." },
            score: 0,
            total: totalMarks
        });
    }

    if (!images || images.length === 0) {
        return res.status(400).json({ error: 'Missing images' });
    }

    // --- THE DYNAMIC PROMPT ---
    const systemPrompt = `You are an Anatomy Examiner grading a handwritten essay. 
    Read the text from the images and compare it to this Marking Scheme:
    ${markingScheme}
    
    You must reply with ONLY a valid JSON object, without any markdown formatting or backticks. 

    CRITICAL INSTRUCTION FOR BREAKDOWN: 
    Look at the Marking Scheme above. The "breakdown" array in your JSON response MUST dynamically match the sections of the Marking Scheme. 
    - If the scheme has "Boundaries" and "Contents", create 2 objects.
    - If the scheme has "Origin", "Pathway", and "Lesions", create 3 objects.
    - If the scheme has 5 sections, create 5 objects.
    Extract the section names directly from the Marking Scheme and use them.

    The JSON must have exactly this structure:
    {
        "score": [integer total score out of ${totalMarks}],
        "breakdown": [
            { "section": "[Section Name from Marking Scheme]", "score": "[X]/[Total Marks for this section]", "rationale": "Detailed paragraph of what they wrote, what was correct, and what was missing." }
        ],
        "overallRationale": "2-3 sentence summary of their performance.",
        "advice": "One short sentence of exam advice."
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
                model: "nvidia/nemotron-3.5-super-vl:free",
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
