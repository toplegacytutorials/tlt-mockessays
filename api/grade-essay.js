export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;
    
    const apiKey = "mstrl_jUVKTm7uzfHyGpiELlX2rlhxpcFC0ubB_4az0F1";

    let totalMarks = 10; 
    let markingScheme = "";

    if (examId === 'carotid_triangle') {
        totalMarks = 10;
        markingScheme = `
        Question: Discuss the boundaries and contents of the Carotid Triangle.
        
        Marking Scheme (Total 10 marks):
        1. Boundaries (3 marks): 
           - Superior: Posterior belly of Digastric and Stylohyoid muscle.
           - Posterior: Anterior border of Sternocleidomastoid (SCM) muscle.
           - Inferior: Superior belly of Omohyoid muscle.
        2. Contents (5 marks): 
           - Arterial: Common Carotid Artery.
           - Venous: Internal Jugular Vein.
           - Nerves: Vagus Nerve, Hypoglossal Nerve, Spinal Accessory Nerve, Ansa Cervicalis, Sympathetic Trunk.
           - Lymphatics: Deep Cervical Lymph Nodes.
        3. Diagram (2 marks): Must show the triangle with its boundaries clearly labeled.
        
        CRITICAL RULES FOR THE EXAMINER:
        - DO NOT deduct marks for extra anatomical information. If the student includes the roof, floor, or clinical correlations, this is EXCELLENT and should be rewarded with full marks. 
        - Be generous. If they have the 3 boundaries, the contents, and a diagram, they get 10/10.`;

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

    const systemPrompt = `You are an Anatomy Examiner grading a handwritten essay. 
    Read the text from the images and compare it to this Marking Scheme:
    ${markingScheme}
    
    You must reply with ONLY a valid JSON object, without any markdown formatting or backticks. The JSON must have exactly this structure:
    {
        "score": [integer score out of ${totalMarks}],
        "correct": ["List of things the student got right"],
        "missed": ["List of things the student missed. If they got everything, say 'Nothing missed'"],
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
                temperature: 0,
                response_format: { type: "json_object" } 
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: `Mistral API Error: ${data.error.message || data.error}` });
        }
        
        if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
            return res.status(500).json({ error: "No valid response from Mistral. Please try again." });
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
