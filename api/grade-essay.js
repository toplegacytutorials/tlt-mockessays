export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { examId, image, mimeType } = req.body;

    if (!image || !examId) {
        return res.status(400).json({ error: 'Missing image or examId' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // --- DATABASE OF MARKING SCHEMES ---
    let markingScheme = "";
    let totalMarks = 10; 

    if (examId === 'carotid_triangle') {
        totalMarks = 10;
        markingScheme = `
        Question: Discuss the boundaries and contents of the Carotid Triangle.
        Boundaries (3 marks): Superior belly of omohyoid, posterior belly of digastric, anterior border of SCM.
        Contents (5 marks): Common carotid artery, internal jugular vein, vagus nerve, ansa cervicalis, hypoglossal nerve.
        Diagram (2 marks): Must show the triangle clearly.
        `;
    } else if (examId === 'neuro_corticospinal') {
        totalMarks = 15;
        markingScheme = `
        Question: Discuss the pathways of the corticospinal tract.
        Origin (3 marks): Motor cortex.
        Pathway (6 marks): Internal capsule, crus cerebri, pons, medulla.
        Decussation (2 marks): Pyramidal decussation in medulla.
        Lesions (4 marks): UMN vs LMN signs.
        `;
    } else {
        return res.status(400).json({ error: 'Invalid Exam ID' });
    }

    const systemPrompt = `You are a strict Anatomy Examiner grading a handwritten essay.
    Read the text from the uploaded image and compare it strictly to this Marking Scheme:
    ${markingScheme}
    
    Rules:
    1. At the very top of your response, you MUST output exactly: "SCORE: [X]/${totalMarks}" (replace X with the actual score).
    2. Then provide feedback using headers: "WHAT YOU GOT RIGHT:", "WHAT YOU MISSED:", and "EXAMINER ADVICE:".`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }, { inline_data: { mime_type: mimeType, data: image } }] }]
            })
        });

        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        
        const scoreMatch = responseText.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
        let score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

        return res.status(200).json({
            feedback: responseText,
            score: score,
            total: totalMarks
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to grade essay' });
    }
}
