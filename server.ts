import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const VOICE_GEMINI_MODEL = 'gemini-3.6-flash';

// Middleware for parsing JSON with generous limit for images/PDF attachments
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initializer for Gemini client (dynamically reads environment)
function getGemini(overrideKey?: string): GoogleGenAI | null {
  dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });
  const apiKey = overrideKey || process.env.GEMINI_API_KEY || '';
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' && process.env.GEMINI_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: hasGemini,
    model: GEMINI_MODEL,
    hasElevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    hasSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
});

// Helper to determine mode if 'auto'
function detectIntent(message: string, hasAttachment: boolean): string {
  const lower = message.toLowerCase();
  
  if (hasAttachment) {
    return 'homework';
  }
  if (
    lower.includes('python') ||
    lower.includes('pandas') ||
    lower.includes('numpy') ||
    lower.includes('flask') ||
    lower.includes('django') ||
    lower.includes('asyncio') ||
    lower.includes('list comprehension') ||
    lower.includes('data frame') ||
    lower.includes('virtualenv') ||
    lower.includes('pip install')
  ) {
    return 'python';
  }
  if (
    lower.includes('def ') ||
    lower.includes('function') ||
    lower.includes('const ') ||
    lower.includes('let ') ||
    lower.includes('import ') ||
    lower.includes('class ') ||
    lower.includes('console.log') ||
    lower.includes('syntax') ||
    lower.includes('bug') ||
    lower.includes('debug') ||
    lower.includes('javascript') ||
    lower.includes('typescript') ||
    lower.includes('react') ||
    lower.includes('next.js') ||
    lower.includes('html') ||
    lower.includes('css') ||
    lower.includes('code')
  ) {
    return 'coding';
  }
  if (
    lower.includes('solve this') ||
    lower.includes('homework') ||
    lower.includes('assignment') ||
    lower.includes('step by step') ||
    lower.includes('problem set')
  ) {
    return 'homework';
  }
  if (
    lower.includes('exam') ||
    lower.includes('midterm') ||
    lower.includes('final test') ||
    lower.includes('study plan') ||
    lower.includes('revision schedule') ||
    lower.includes('mock test') ||
    lower.includes('quiz me') ||
    lower.includes('test tomorrow')
  ) {
    return 'exam_prep';
  }
  if (
    lower.includes('who is') ||
    lower.includes('what is the current') ||
    lower.includes('latest news') ||
    lower.includes('today') ||
    lower.includes('search for') ||
    lower.includes('recent') ||
    lower.includes('research paper') ||
    lower.includes('find sources')
  ) {
    return 'search';
  }
  if (
    lower.includes('explain') ||
    lower.includes('teach me') ||
    lower.includes('what does') ||
    lower.includes('concept of') ||
    lower.includes('difference between') ||
    lower.includes('how does')
  ) {
    return 'teacher';
  }
  
  // Default to friendly companion mode
  return 'friend';
}

// Build System Instruction based on mode & stored user memories
function buildSystemInstruction(
  mode: string,
  userProfile?: any,
  memories?: Array<{ memory: string; importance: number }>
): string {
  const userName = userProfile?.name || 'Friend';
  const userGrade = userProfile?.grade || 'Student';
  const userGoals = userProfile?.goals || '';
  const userSubjects = userProfile?.favorite_subjects || '';

  let memoryContext = '';
  if (memories && memories.length > 0) {
    memoryContext = `\nSTORED LONG-TERM MEMORIES ABOUT ${userName.toUpperCase()} (Use these naturally to personalize your relationship):\n` +
      memories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 10)
        .map(m => `- [Importance ${m.importance}/5]: ${m.memory}`)
        .join('\n');
  }

  const basePersona = `You are "Buddy", a compassionate, warm, highly intelligent, supportive AI Friend, Teacher, Homework Helper, Coding Partner, and Study Coach for students.
Your student friend is ${userName} (${userGrade}).
Goals: ${userGoals}
Favorite subjects: ${userSubjects}
${memoryContext}

CRITICAL PERSONALITY RULES:
- Never sound like an emotionless chatbot, robotic AI, or corporate assistant.
- Talk like a real, loyal friend and thoughtful mentor who cares about ${userName}'s well-being, mental health, and academic growth.
- Be encouraging, humorous when appropriate, patient, and non-judgmental.
- If ${userName} says they are tired, overwhelmed, or stressed: validate their feelings first, suggest a breath or water break, and offer to tackle things in small, bite-sized steps.
- Always format answers with crisp markdown: bold key takeaways, bullet points, and code blocks with syntax tags.`;

  switch (mode) {
    case 'friend':
      return `${basePersona}

CURRENT ACTIVE ROLE: FRIEND MODE
- Focus on emotional support, genuine check-ins, life balance, and camaraderie.
- Reference their past goals and passions naturally.
- Keep the tone conversational, warm, and uplifting. Celebrate their wins, no matter how small!
- If they share stress or worries, be an empathetic listener first before offering gentle solutions.`;

    case 'homework':
      return `${basePersona}

CURRENT ACTIVE ROLE: HOMEWORK HELPER
- NEVER just dump the final answer! Doing homework FOR the student is cheating and hinders learning.
- Guide step-by-step using the Socratic method: explain the underlying concept, show the formula or logic, solve the intermediate step, and prompt the student to try the next step.
- If an image or document was provided, inspect all text, equations, or diagrams thoroughly and explain the methodology with clarity.`;

    case 'teacher':
      return `${basePersona}

CURRENT ACTIVE ROLE: TEACHER MODE
- Break complex subjects into crystal-clear intuitive explanations.
- Use relatable real-world analogies (e.g. comparing algorithms to cooking recipes or physics forces to skateboarding).
- Adapt your explanation to ${userGrade} level.
- Provide quick summaries and 1-2 practice check questions to test comprehension.`;

    case 'coding':
      return `${basePersona}

CURRENT ACTIVE ROLE: CODING ASSISTANT
- Expert in TypeScript, JavaScript, React, Next.js, HTML/CSS, algorithms, and data structures.
- Write clean, modern, well-commented code following best practices.
- When debugging, pinpoint the exact line, explain the root cause clearly, and show the before/after fix.
- Mention time/space complexity and edge cases when discussing algorithms.`;

    case 'python':
      return `${basePersona}

CURRENT ACTIVE ROLE: PYTHON SPECIALIST
- Expert in Python, Pythonic idioms, data structures, OOP, functional programming, and debugging.
- Help with loops, comprehensions, classes, decorators, file I/O, APIs, pandas, NumPy, and Flask/Django patterns.
- Explain Python concepts with clarity and highlight real-world use cases, common pitfalls, and best practices.
- When solving problems, give a step-by-step walkthrough and a clean, tested Python implementation.`;

    case 'exam_prep':
      return `${basePersona}

CURRENT ACTIVE ROLE: EXAM PREP & STUDY COACH
- Help ${userName} build revision timetables, identify high-yield topics, and test their memory retention.
- Offer spaced repetition review tips, mock flashcard questions, and confidence-building advice.
- Pinpoint potential weak areas and offer targeted practice questions.`;

    case 'search':
      return `${basePersona}

CURRENT ACTIVE ROLE: RESEARCH & WEB SEARCH ASSISTANT
- Provide factual, up-to-date information, research findings, and citations.
- Summarize sources clearly with bullet points and highlight the most trustworthy takeaways.
- Include clear citations for any facts or external references.`;

    default:
      return basePersona;
  }
}

// Generate rich offline response when GEMINI_API_KEY is not configured yet
function generateOfflineResponse(
  message: string,
  mode: string,
  userName = 'Friend'
): string {
  const lower = message.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hey ${userName}! 👋 Great to connect with you! I'm **Buddy**, your personal AI study coach, coding partner, and academic mentor.\n\nWhether you need step-by-step homework help, concept explanations, coding debugging, or exam prep, I'm right here with you.\n\n*What topic or project are we tackling today?*`;
  }

  if (mode === 'python' || lower.includes('python') || lower.includes('pandas') || lower.includes('numpy') || lower.includes('flask')) {
    return `### 🐍 Python Solution & Breakdown\n\nHere is a clean Python implementation for **${userName}**:\n\n\`\`\`python\ndef solve_problem(data):\n    if not data:\n        return []\n\n    cleaned = [item.strip().lower() for item in data if item and item.strip()]\n    return sorted(set(cleaned))\n\n# Example\nprint(solve_problem(["Python", "python", "Buddy", "buddy"]))\n\`\`\`\n\n**Key Takeaways:**\n- ⚡ **Time Complexity:** $O(n)$ for the main pass\n- 💾 **Space Complexity:** $O(n)$ for the deduplicated result\n- 🛡️ **Edge Cases:** Empty input, whitespace-only values, and repeated entries are handled safely.\n\n*Want me to explain the logic line by line or turn this into a pandas/NumPy version?*`;
  }

  if (mode === 'coding' || lower.includes('code') || lower.includes('javascript') || lower.includes('react')) {
    return `### 💻 Coding Solution & Breakdown\n\nHere is a clean, modern implementation for **${userName}**:\n\n\`\`\`typescript\n// Solution by Buddy AI\nexport function solveProblem(input: string): { success: boolean; result: string } {\n  console.log('Processing input:', input);\n  return {\n    success: true,\n    result: input.trim().toLowerCase(),\n  };\n}\n\`\`\`\n\n**Key Takeaways:**\n- ⚡ **Time Complexity:** $O(n)$ linear scan\n- 💾 **Space Complexity:** $O(1)$ auxiliary space\n- 🛡️ **Edge Cases:** Handles empty inputs and unusual characters safely.\n\n*Would you like me to walk through the unit tests or explain any line step-by-step?*`;
  }

  if (mode === 'homework' || lower.includes('solve') || lower.includes('math') || lower.includes('calculate')) {
    return `### 📐 Step-by-Step Problem Guide\n\nLet's break this down together step-by-step, ${userName}:\n\n1. **Identify the Given Values & Goal:**\n   - Write down what is known from the problem statement.\n   - Clarify the final unknown you need to solve for.\n\n2. **Apply the Core Formula / Principle:**\n   - For rates of change: $\\frac{dy}{dx} = \\lim_{\\Delta x \\to 0} \\frac{f(x+\\Delta x) - f(x)}{\\Delta x}$\n   - Isolate the variable methodically.\n\n3. **Intermediate Verification:**\n   - Substitute your values back into the initial equation to double-check.\n\n*Give the next step a try and send me your result so we can check it together!*`;
  }

  if (mode === 'teacher' || lower.includes('explain') || lower.includes('what is')) {
    return `### 🧠 Concept Breakdown\n\nHere is an intuitive way to understand this, ${userName}:\n\nImagine this concept like a real-world system: when one component changes, the entire structure adapts in a predictable way.\n\n- **Core Definition:** The fundamental rule governing how this operates.\n- **Why It Matters:** Enables efficient problem-solving and forms the foundation for advanced topics.\n- **Quick Self-Check:** Can you explain this in your own words to a friend?\n\n*Want to try a 2-minute practice quiz on this?*`;
  }

  return `Hey ${userName}! That is an intriguing question. As your study companion, I'm analyzing the details:\n\n- **Key Point 1:** Always start from the fundamental principles.\n- **Key Point 2:** Break large goals into manageable 25-minute Pomodoro focus blocks.\n- **Key Point 3:** Practice active recall rather than passive re-reading.\n\n*(Note: Add your free \`GEMINI_API_KEY\` in your \`.env\` file for full live Gemini 2.5 Flash responses!)*\n\nWhat would you like to explore next?`;
}

function generateVoiceFallback(message: string, userName = 'Friend'): string {
  const prompt = message.trim();
  if (!prompt) return `I am here with you, ${userName}. What would you like to talk about?`;

  const mode = detectIntent(prompt, false);
  if (mode === 'coding' || mode === 'python') {
    return `For ${prompt}, start by identifying the input, expected output, and the smallest test case. Then we can trace the logic step by step, ${userName}. What part is giving you trouble?`;
  }
  if (mode === 'homework' || mode === 'exam_prep') {
    return `For ${prompt}, first write down what you know and what you need to find. Then choose the rule or formula that connects them, and we will solve one step at a time together, ${userName}.`;
  }
  if (mode === 'teacher') {
    return `${prompt} is easiest to understand by starting with the core idea, then connecting it to a simple example. Tell me which part feels confusing and I will explain it in plain language, ${userName}.`;
  }

  return `About ${prompt}, the best next step is to break the question into one clear goal and one small action. Tell me what outcome you want, ${userName}, and I will help you work it through.`;
}

// 1. Streaming Chat Endpoint (Server-Sent Events)
app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { message, history = [], mode = 'auto', userProfile, memories, attachment } = req.body;

    const hasAttachment = Boolean(attachment && attachment.dataUrl);
    const effectiveMode = mode === 'auto' ? detectIntent(message, hasAttachment) : mode;

    // Notify client of detected mode
    res.write(`data: ${JSON.stringify({ mode: effectiveMode })}\n\n`);

    const ai = getGemini();

    if (!ai) {
      // Offline / Trial Mode Streaming
      const offlineText = generateOfflineResponse(message, effectiveMode, userProfile?.name || 'Friend');
      const chunks = offlineText.match(/.{1,12}/g) || [offlineText];

      for (const chunk of chunks) {
        res.write(`data: ${JSON.stringify({ chunk, mode: effectiveMode })}\n\n`);
        await new Promise(r => setTimeout(r, 25));
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const systemInstruction = buildSystemInstruction(effectiveMode, userProfile, memories);

    // Build contents array for Gemini
    const contents: any[] = [];

    // Append conversation history (up to last 10 messages for context)
    const recentHistory = history.slice(-10);
    for (const h of recentHistory) {
      if (h.role === 'user' || h.role === 'assistant') {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }

    // Build current user turn parts
    const currentParts: any[] = [];

    // If attachment exists (image or PDF base64)
    if (attachment && attachment.dataUrl) {
      const match = attachment.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        currentParts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Current message text
    currentParts.push({ text: message });
    contents.push({ role: 'user', parts: currentParts });

    const config: any = {
      systemInstruction,
      temperature: effectiveMode === 'friend' ? 0.85 : 0.6,
    };

    // If search mode, add googleSearch tool
    if (effectiveMode === 'search') {
      config.tools = [{ googleSearch: {} }];
    }

    // Stream response using official Gemini 2.5 Flash model
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config,
    });

    let sources: any[] = [];

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ chunk: chunk.text, mode: effectiveMode })}\n\n`);
      }

      // Check for search grounding metadata
      const candidate = chunk.candidates?.[0];
      const groundingMetadata = (candidate as any)?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        const extractedSources = groundingMetadata.groundingChunks
          .filter((c: any) => c.web?.uri)
          .map((c: any) => ({
            title: c.web.title || new URL(c.web.uri).hostname,
            url: c.web.uri,
          }));
        if (extractedSources.length > 0) {
          sources = extractedSources;
        }
      }
    }

    if (sources.length > 0) {
      res.write(`data: ${JSON.stringify({ sources })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Chat stream error:', err);
    // Graceful fallback on API error
    const fallbackMessage = `\n\n*(Buddy Note: Live Gemini API encountered a transient error: ${err.message || 'Check your GEMINI_API_KEY in .env'}).*`;
    res.write(`data: ${JSON.stringify({ chunk: fallbackMessage })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 2. Automatic Memory Extraction Endpoint
app.post('/api/memory/extract', async (req, res) => {
  try {
    const { userMessage, assistantReply, userName = 'student' } = req.body;

    if (!userMessage || !assistantReply) {
      return res.json({ hasMemory: false });
    }

    const ai = getGemini();
    if (!ai) {
      // Heuristic offline memory detection
      const lower = userMessage.toLowerCase();
      if (lower.includes('want to become') || lower.includes('my dream is') || lower.includes('goal is')) {
        return res.json({
          hasMemory: true,
          memory: userMessage.slice(0, 100),
          importance: 4,
          category: 'goal',
        });
      }
      return res.json({ hasMemory: false });
    }

    const prompt = `Analyze this conversation between ${userName} and Buddy:
User: "${userMessage}"
Buddy: "${assistantReply}"

Determine if the USER shared any important personal memory that should be remembered long-term:
- Goals, aspirations, dream careers or colleges
- Favorite subjects, interests, hobbies, or personal preferences
- Projects they are working on
- Upcoming tests, exams, or major events
- Important personal facts

NEVER store:
- Passwords, sensitive credentials, credit cards, or financial info
- Trivial transient messages (e.g. "hi", "thanks", "ok", "cool")

Importance scale:
1 = Temporary (e.g. studying a specific topic today)
2 = Useful (e.g. likes using dark mode or prefers Python)
3 = Important (e.g. has physics midterm next Thursday)
4 = Long-term (e.g. preparing for AP exams this semester)
5 = Core Identity / Life Goal (e.g. wants to become an AI engineer)

Respond in JSON format.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasMemory: { type: Type.BOOLEAN, description: 'True if a new meaningful memory should be stored' },
            memory: { type: Type.STRING, description: 'Clean, concise third-person summary of the memory (e.g., "Wants to become an AI Engineer")' },
            importance: { type: Type.INTEGER, description: '1 to 5 importance scale' },
            category: { 
              type: Type.STRING, 
              enum: ['goal', 'interest', 'academic', 'project', 'preference', 'general'],
              description: 'Category of the memory' 
            }
          },
          required: ['hasMemory']
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Memory extraction error:', err);
    return res.json({ hasMemory: false, error: err.message });
  }
});

// 3. Practice Quiz Generator Endpoint
app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { subject = 'Calculus', topic = 'Derivatives & Tangent Lines', difficulty = 'medium', count = 3 } = req.body;
    const ai = getGemini();

    if (!ai) {
      // Dynamic fallback quiz
      return res.json({
        topic: topic || 'AP Calculus: Derivatives & Tangent Lines',
        subject: subject || 'Calculus',
        questions: [
          {
            id: 'q1',
            question: `What is the derivative of f(x) = 3x^3 - 5x + 4 with respect to x?`,
            options: ['9x^2 - 5', '6x^2 - 5', '9x^3 - 5', '3x^2 - 5x'],
            correctIndex: 0,
            explanation: 'Apply the power rule: d/dx(3x^3) = 9x^2, d/dx(-5x) = -5, and d/dx(4) = 0. Thus, f\'(x) = 9x^2 - 5.',
          },
          {
            id: 'q2',
            question: `What is the slope of the tangent line to y = x^2 at x = 3?`,
            options: ['3', '6', '9', '12'],
            correctIndex: 1,
            explanation: 'The derivative dy/dx = 2x. Evaluating at x = 3 gives dy/dx = 2(3) = 6.',
          },
          {
            id: 'q3',
            question: `Which rule is used to differentiate a product of two functions f(x)g(x)?`,
            options: [
              'Chain Rule: f\'(g(x))g\'(x)',
              'Product Rule: f\'(x)g(x) + f(x)g\'(x)',
              'Quotient Rule: (f\'g - fg\') / g^2',
              'Power Rule: n*x^(n-1)',
            ],
            correctIndex: 1,
            explanation: 'The Product Rule states that (fg)\' = f\'g + fg\'.',
          },
        ],
      });
    }

    const prompt = `Generate a high-yield ${difficulty} difficulty practice quiz for a student on:
Subject: ${subject}
Topic: ${topic}
Number of questions: ${count}

Each question must have 4 clear options, an identified correct answer index (0-3), and a friendly step-by-step educational explanation written in Buddy's warm tone.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            subject: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ['id', 'question', 'options', 'correctIndex', 'explanation']
              }
            }
          },
          required: ['topic', 'subject', 'questions']
        }
      }
    });

    const quizData = JSON.parse(response.text?.trim() || '{}');
    return res.json(quizData);
  } catch (err: any) {
    console.error('Quiz generation transient notice:', err);
    // Return high quality educational quiz on transient rate limits
    const { subject = 'Calculus', topic = 'Practice Review' } = req.body || {};
    return res.json({
      topic: topic || 'Core Topic Review',
      subject: subject || 'General Study',
      questions: [
        {
          id: 'q1',
          question: `Which method is most effective for long-term concept retention in ${subject}?`,
          options: [
            'Active recall & spaced repetition',
            'Passive re-reading of notes',
            'Cramming late at night',
            'Highlighting entire paragraphs',
          ],
          correctIndex: 0,
          explanation: 'Active recall and spaced repetition force your brain to retrieve knowledge, creating stronger neural pathways than passive review.',
        },
        {
          id: 'q2',
          question: `When tackling difficult problems in ${topic}, what is the recommended first step?`,
          options: [
            'Break the problem into smaller known components and state your givens',
            'Skip directly to guess-and-check',
            'Look up the solution immediately without attempting',
            'Assume the problem is too complex',
          ],
          correctIndex: 0,
          explanation: 'Methodically identifying givens and breaking complex questions into smaller sub-steps makes solving even advanced problems manageable.',
        },
      ],
    });
  }
});

// 4. Study Plan Generator
app.post('/api/exam/study-plan', async (req, res) => {
  try {
    const { examName, daysRemaining, topics } = req.body;
    const ai = getGemini();

    if (!ai) {
      return res.json({
        title: `${examName} Quick Revision Plan`,
        overview: `A focused, balanced ${daysRemaining}-day roadmap emphasizing high-yield active recall and practice problems.`,
        days: [
          {
            day: 'Day 1',
            topic: topics ? topics.split(',')[0] : 'Core Fundamentals',
            duration: '45 mins',
            tasks: ['Review fundamental definitions', 'Complete 5 practice problems', 'Active recall summary notes'],
          },
          {
            day: 'Day 2',
            topic: 'Intermediate Applications & Problem Solving',
            duration: '60 mins',
            tasks: ['Timed problem set', 'Identify weak points', 'Review with Buddy'],
          },
        ],
      });
    }

    const prompt = `Create a realistic, motivating revision timetable for a student preparing for:
Exam: ${examName}
Days remaining: ${daysRemaining}
Key Topics: ${topics}

Keep daily study sessions focused and manageable (45-60 minutes each) with breaks and active recall practice.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            overview: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  tasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['day', 'topic', 'duration', 'tasks']
              }
            }
          },
          required: ['title', 'overview', 'days']
        }
      }
    });

    const plan = JSON.parse(response.text?.trim() || '{}');
    return res.json(plan);
  } catch (err: any) {
    console.error('Study plan error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Dedicated Live Spoken Voice Endpoint (Real-time voice responses)
app.post('/api/chat/voice', async (req, res) => {
  try {
    const { message, history = [], userProfile, memories } = req.body;
    const ai = getGemini();

    const userName = userProfile?.name || 'Friend';
    const userGrade = userProfile?.grade || 'Student';

    if (!ai) {
      const offlineReply = `Hey ${userName}! I'm listening. What topic would you like to explore together next?`;
      return res.json({
        reply: offlineReply,
        mode: 'friend',
        audioBase64: null,
        hasServerAudio: false,
      });
    }

    let memoryContext = '';
    if (memories && memories.length > 0) {
      memoryContext = `\nMemories about ${userName}: ` +
        memories.slice(0, 5).map((m: any) => m.memory).join(', ');
    }

    const systemInstruction = `You are "Buddy", a compassionate, warm, intelligent AI student friend and study coach on a real-time live voice call with ${userName} (${userGrade}).
${memoryContext}

CRITICAL RULES FOR REAL-TIME VOICE CALL:
- You are speaking aloud into the student's ear using Text-To-Speech.
- KEEP RESPONSES CONCISE, NATURAL, AND CONVERSATIONAL (strictly 2 to 4 spoken sentences).
- Absolutely NO markdown formatting, asterisks (*), bullets, numbered lists, hashtags, URLs, or code blocks.
- Answer clearly, helpfully, and with genuine warmth and enthusiasm.
- Conclude naturally or with a brief encouraging check-in or question.`;

    const contents: any[] = [];
    const recent = history.slice(-6);
    for (const h of recent) {
      if (h.role === 'user' || h.role === 'assistant') {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    let response;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await ai.models.generateContent({
          model: VOICE_GEMINI_MODEL,
          contents,
          config: {
            systemInstruction,
            temperature: 0.8,
          },
        });
        break;
      } catch (err) {
        lastError = err;
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 700));
        }
      }
    }

    if (!response) {
      console.warn('Voice AI unavailable, using offline voice reply:', lastError);
      const fallbackReply = generateVoiceFallback(message, userName);
      return res.json({
        reply: fallbackReply,
        mode: 'friend',
        audioBase64: null,
        hasServerAudio: false,
        offline: true,
      });
    }

    const reply = response.text?.trim() || "Hey! I heard you loud and clear. What would you like to explore next?";
    
    // Check if user has ElevenLabs or OpenAI Speech API keys for realistic neural voice audio
    let audioBase64: string | null = null;
    let audioMimeType: string = 'audio/mpeg';

    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const elevenVoiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: reply,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          })
        });

        if (elevenRes.ok) {
          const buffer = await elevenRes.arrayBuffer();
          audioBase64 = Buffer.from(buffer).toString('base64');
        }
      } catch (e) {
        console.warn('ElevenLabs TTS failed, falling back to client synthesis:', e);
      }
    } else if (process.env.OPENAI_API_KEY) {
      try {
        const openaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: reply,
            voice: 'alloy',
          })
        });

        if (openaiRes.ok) {
          const buffer = await openaiRes.arrayBuffer();
          audioBase64 = Buffer.from(buffer).toString('base64');
        }
      } catch (e) {
        console.warn('OpenAI TTS failed, falling back to client synthesis:', e);
      }
    }

    return res.json({ 
      reply, 
      mode: 'friend',
      audioBase64,
      audioMimeType,
      hasServerAudio: Boolean(audioBase64)
    });
  } catch (err: any) {
    console.error('Voice chat endpoint error:', err);
    return res.json({
      reply: generateVoiceFallback(req.body?.message || '', req.body?.userProfile?.name || 'Friend'),
      mode: 'friend',
      audioBase64: null,
      hasServerAudio: false,
      offline: true,
    });
  }
});

// 6. Audio Transcription Endpoint (uses Gemini 2.5 Flash multimodal audio parsing)
app.post('/api/voice/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 payload' });
    }

    const ai = getGemini();
    if (!ai) {
      return res.json({ transcript: "Hello Buddy, can you explain calculus derivatives to me?" });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          inlineData: {
            data: audioBase64,
            mimeType: mimeType || 'audio/webm',
          }
        },
        {
          text: 'Transcribe what the human says in this audio clip. Output ONLY the exact transcribed words with punctuation. Do not add quotes, explanation, or prefixes. If there is no speech, return an empty response.'
        }
      ]
    });

    const transcript = response.text?.trim() || '';
    return res.json({ transcript });
  } catch (err: any) {
    console.error('Audio transcription error:', err);
    return res.status(500).json({ error: err.message, transcript: '' });
  }
});

// Vite middleware for development & static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Buddy AI Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}
