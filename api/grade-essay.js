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
        totalMarks = 22; // 20 marks + 2 bonus
        markingScheme = `
        Question: Describe the mandible under the following headings.
        Total Marks: 22 (Includes 2 Bonus Marks)
        
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
        totalMarks = 11; // 10 marks + 1 bonus
        markingScheme = `
        Question: Discuss the temporal bone.
        Total Marks: 11 (Includes 1 Bonus Mark)
        
        1. Introduction (1 Mark): Paired bone of the cranial skeleton (neurocranium) contributing to the lateral wall and base of the skull.
        2. Gross Parts & Developmental Notes (5 Marks): 
           - Four parts (2.5 Marks): Squamous part, Petromastoid part, Tympanic part, Styloid process.
           - Mastoid air cell variants (1.5 Marks): Pneumatic, diploeic, sclerotic.
           - Developmental note (1 Mark): Tympanic cavity, mastoid antrum, ear ossicles, and internal ear are full adult size at birth.
        3. Applied Anatomy (4 Marks): Middle ear infections (otitis media) spread to mastoid antrum causing mastoiditis (2 Marks). Risk of eroding into cranial cavity forming a temporal lobe abscess (2 Marks).
        
        Bonus: Simple labeled diagram showing the four gross parts (+1 Mark).
        `;
    } else if (examId === 'deep_cervical_fascia') {
        totalMarks = 22; // 20 marks + 2 bonus
        markingScheme = `
        Question: Describe the deep cervical fascia of the neck.
        Total Marks: 22 (Includes 2 Bonus Marks)

        1. Introduction (1 Mark): Laminar condensations of loose areolar tissue forming compartments, glandular capsules, neurovascular sheaths, and infection pathways; comprises three main layers (investing, pretracheal, prevertebral) and two derivatives (carotid sheath, buccopharyngeal fascia).
        2. Layers and Attachments (6 Marks): 
           - Investing layer (2 Marks): Encircles the neck... attaches to occipital protuberance, mandible, clavicle, etc. Splits around trapezius, SCM.
           - Pretracheal fascia (1.5 Marks): Covers trachea, attaches to thyroid oblique line/cricoid, thickens as ligament of Berry.
           - Prevertebral fascia (1.5 Marks): Extremely strong layer anterior to prevertebral muscles... forms floor of posterior triangle, axillary sheath.
           - Derivatives (1 Mark): Carotid sheath, buccopharyngeal fascia.
        3. Structures Enclosed (5 Marks): 
           - Investing layer "Rule of 2" (2.5 Marks): 2 muscles, 2 glands (parotid, submandibular), 2 fascial pulleys.
           - Pretracheal (0.5 Marks): False capsule of thyroid.
           - Prevertebral (0.5 Marks): Axillary sheath encloses brachial plexus & subclavian artery.
           - Carotid sheath (1.5 Marks): CCA, ICA, IJV, Vagus nerve. Ansa cervicalis embedded anteriorly, sympathetic chain posteriorly.
        4. Fascial Spaces Formed (4 Marks): 
           - Suprasternal space of Burns (1 Mark)
           - Supraclavicular space (1 Mark)
           - Retropharyngeal space (1.5 Marks): Between buccopharyngeal and prevertebral fasciae. Midline raphe splits into Spaces of Gillette.
           - Prevertebral space (0.5 Mark)
        5. Clinical Importance (4 Marks): 
           - Pretracheal (1 Mark): Thyroid moves on swallowing; goitre bulging posteriorly causing dysphagia.
           - Retropharyngeal (1 Mark): Infections descend to mediastinum; paramedian bulge.
           - Prevertebral (1 Mark): Cold abscess from cervical TB; tracks into axilla.
           - Carotid sheath (1 Mark): IJV resection during block dissection.
        
        Bonus: Labeled transverse section diagram (+2 Marks).
        `;
    } else if (examId === 'facial_artery') {
        totalMarks = 11.5; // 10 marks + 1.5 bonus
        markingScheme = `
        Question: Write short notes on the Facial artery.
        Total Marks: 11.5 (Includes 1.5 Bonus Marks)

        1. Introduction (1 Mark): Chief artery of the face, arising from the external carotid artery at the greater cornu of the hyoid bone.
        2. Course & Pulse Points (4 Marks): 
           - Winds around base of mandible at anteroinferior angle of masseter (2.5 Marks). 
           - Two pulse points: base of mandible just anterior to masseter, and 1.25 cm lateral to mouth angle (1.5 Marks).
        3. Branches & Anastomoses (3 Marks): 
           - Anterior branches: inferior labial, superior labial, lateral nasal. Posterior: unnamed muscular branches (1.5 Marks).
           - Angular artery anastomoses with dorsal nasal branch of ophthalmic artery; rich midline labial anastomoses (1.5 Marks).
        4. Applied Anatomy (2 Marks): Tortuosity prevents stretching during jaw/lip movements; rich midline anastomoses cause cut labial arteries to spurt from both ends.
        
        Bonus: Labeled diagram of the course and branches (+1.5 Marks).
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
