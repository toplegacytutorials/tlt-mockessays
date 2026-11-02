export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { examId, images, mimeType, autoZero } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    let markingScheme = "";
    let totalMarks = 10; 

    if (examId === 'carotid_triangle') {
        totalMarks = 10;
        markingScheme = `Question: Discuss the boundaries and contents of the Carotid Triangle.
        Boundaries (3 marks), Contents (5 marks), Diagram (2 marks).`;
    } else if (examId === 'neuro_corticospinal') {
        totalMarks = 15;
        markingScheme = `Question: Discuss the pathways of the corticospinal tract.
        Origin (3 marks), Pathway (6 marks), Decussation (2 marks), Lesions (4 marks).`;
    } else {
        return res.status(400).json({ error: 'Invalid Exam ID' });
    }

    // HANDLE AUTO-ZERO (If they ran out of time)
    if (autoZero) {
        return res.status(200).json({
            feedback: "Time expired. The assessment was automatically submitted with a score of 0.",
            score: 0,
            total: totalMarks
        });
    }

    if (!images || images.length === 0) {
        return res.status(400).json({ error: 'Missing images' });
    }

    const systemPrompt = `You are a strict Anatomy Examiner grading a handwritten essay.
    Read the text from the uploaded images and compare it strictly to this Marking Scheme:
    ${markingScheme}
    
    Rules:
    1. At the very top of your response, you MUST output exactly: "SCORE: [X]/${totalMarks}".
    2. Then provide feedback using headers: "WHAT YOU GOT RIGHT:", "WHAT YOU MISSED:", and "EXAMINER ADVICE:".`;

    try {
        // Prepare all images for Gemini
        const imageParts = images.map(img => ({
            inline_data: { mime_type: mimeType, data: img }
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        ...imageParts // Spread all images into the request
                    ]
                }]
            })
        });

        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        
        const scoreMatch = responseText.match(/SCORE:\s*(\d+)\s*\/\s*(\d+)/i);
        let score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

        return res.status(200).json({ feedback: responseText, score, total: totalMarks });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to grade essay' });
    }
}
