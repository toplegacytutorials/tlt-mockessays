export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'OpenRouter API Key is missing in Vercel settings.' });
    }

    let totalMarks = 10; 
    let markingScheme = "";

    if (examId === 'mandible_essay') {
        totalMarks = 20;
        markingScheme = `
        Question: Describe the mandible under the following headings.
        Total Marks: 20
        
        1. Introduction (1 Mark): Horseshoe-shaped lower jaw; the only movable skull bone (articulates via synovial TMJ); second bone to ossify in the body.
        2. Gross Parts & Osteological Features (5 Marks): Horseshoe-shaped body, two vertical rami, angle. Ramus features: flat triangular anterior coronoid process, posterior condylar process (head, neck, pterygoid fovea), mandibular notch, inner surface bearing mandibular foramen guarded by lingula.
        3. Muscular, Ligamentous & Nerve Relations (6 Marks): 
           - Muscles (2 Marks): Masseter, Temporalis, Lateral pterygoid, Medial pterygoid.
           - Ligaments (1.5 Marks): Stylomandibular, Temporomandibular, Sphenomandibular.
           - Nerves (2.5 Marks): Lingual, inferior alveolar, mylohyoid, mental, masseteric, auriculotemporal, marginal mandibular.
        4. Age Changes & Sexual Dimorphism (5 Marks): 
           - Mental foramen position (1.5 Marks): Birth (lower border) ➔ Adult (midway) ➔ Old age (close to upper alveolar border).
           - Angle & Fusion (1.5 Marks): 140° (children) ➔ 110° (adults) ➔ 140° (old age). Fuse in 1st year.
           - Sexual dimorphism (2 Marks): Male (larger, thicker, everted angle, quadrilateral chin) vs Female (smaller, thinner, inverted angle, rounded chin).
        5. Applied Anatomy (3 Marks): Common fracture sites (neck, angle, canine region). Double fracture pattern (e.g., neck on one side, contralateral canine region).
        
        Bonus: Well-labeled diagram of the mandible (+2 Marks).
        `;
    } else if (examId === 'temporal_bone_essay') {
        totalMarks = 10;
        markingScheme = `
        Question: Discuss the temporal bone.
        Total Marks: 10
        
        1. Introduction (1 Mark): Paired bone of the cranial skeleton (neurocranium) contributing to the lateral wall and base of the skull.
        2. Gross Parts & Developmental Notes (5 Marks): 
           - Four parts (2.5 Marks): Squamous part, Petromastoid part, Tympanic part, Styloid process.
           - Mastoid air cell variants (1.5 Marks): Pneumatic, diploeic, sclerotic.
           - Developmental note (1 Mark): Tympanic cavity, mastoid antrum, ear ossicles, and internal ear are full adult size at birth.
        3. Applied Anatomy (4 Marks): Middle ear infections (otitis media) spread to mastoid antrum causing mastoiditis (2 Marks). Risk of eroding into cranial cavity forming a temporal lobe abscess (2 Marks).
        
        Bonus: Simple labeled diagram showing the four gross parts (+1 Mark).
        `;
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

    // --- SMART ADAPTATION PROMPT ---
    const systemPrompt = `You are an Anatomy Examiner grading a handwritten essay. 
    Read the text from the images and compare it to this Marking Scheme:
    ${markingScheme}
    
    You must reply with ONLY a valid JSON object, without any markdown formatting or backticks. 

    CRITICAL INSTRUCTION (SMART ADAPTATION): 
    The student's essay may NOT use the exact headings provided in the marking scheme above. 
    DO NOT penalize them for lacking the headings. 
    Instead, search their entire essay for the anatomical facts. 
    - If they mention the coronoid process anywhere, award the marks. 
    - If they mention the 140-degree angle anywhere, award the marks. 
    - Grade the CONTENT (the anatomical facts), not the FORMAT (whether they used headings).

    CRITICAL INSTRUCTION FOR BREAKDOWN: 
    Look at the Marking Scheme above. The "breakdown" array in your JSON response MUST dynamically match the sections of the Marking Scheme (e.g., Introduction, Gross Parts, Muscular Relations, etc.). Extract the section names directly from the Marking Scheme and use them.

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
