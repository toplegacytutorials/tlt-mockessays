export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { examId, image, mimeType } = req.body;

    if (!image || !examId) {
        return res.status(400).json({ error: 'Missing image or examId' });
    }

    // This pulls the secret key you will save in Vercel later
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let markingScheme = "";
    let totalMarks = 10;

    if (examId === 'carotid_triangle_essay') {
        markingScheme = `
        Question: Discuss the boundaries and contents of the Carotid Triangle.
        Total Marks: 10
        Required Keywords:
        - Superior Belly of Omohyoid (1 mark)
        - Posterior Belly of Digastric (1 mark)
        - Anterior border of Sternocleidomastoid (1 mark)
        - Common Carotid Artery (1 mark)
        - Internal Jugular Vein (1 mark)
        - Vagus Nerve / CN X (1 mark)
        - Ansa Cervicalis (1 mark)
        - Hypoglossal Nerve / CN XII (1 mark)
        - Diagram (2 marks). If no diagram is detected, state: "Diagram missing: -2 marks."
        `;
    } else {
        return res.status(400).json({ error: 'Invalid Exam ID' });
    }

    const systemPrompt = `You are a strict Anatomy Examiner grading a handwritten essay.
    Read the text from the uploaded image and compare it strictly to this Marking Scheme:
    ${markingScheme}
    
    Rules:
    1. Only award marks for exact or synonymous anatomical matches to the scheme.
    2. Do not give free marks for general knowledge.
    3. At the very top of your response, you MUST output exactly: "SCORE: [X]/${totalMarks}" (replace X with the actual score).
    4. Then provide the rest of your feedback using these headers: "WHAT YOU GOT RIGHT:", "WHAT YOU MISSED:", and "EXAMINER ADVICE:".`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        { inline_data: { mime_type: mimeType, data: image } }
                    ]
                }]
            })
        });

        const data = await response.json();
        
        // This grabs the text response from Gemini
        const responseText = data.candidates[0].content.parts[0].text;
        
        // This finds the score in the text
        const scoreMatch = responseText.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
        let score = 0;
        if (scoreMatch) {
            score = parseInt(scoreMatch[1], 10);
        }

        return res.status(200).json({
            feedback: responseText,
            score: score,
            total: totalMarks
        });

    } catch (error) {
        console.error("Gemini Error:", error);
        return res.status(500).json({ error: 'Failed to grade essay' });
    }
}
