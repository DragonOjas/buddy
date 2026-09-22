import os
import re
from typing import List, Optional

try:
    import google.generativeai as genai
except Exception:  # pragma: no cover - optional dependency
    genai = None

try:
    import pyttsx3
except Exception:  # pragma: no cover - optional dependency
    pyttsx3 = None

try:
    import speech_recognition as sr
except Exception:  # pragma: no cover - optional dependency
    sr = None


class BuddyEngine:
    """A simple local AI buddy engine with optional Gemini support and voice features."""

    def __init__(self, name: str = "Buddy", voice_enabled: bool = False):
        self.name = name
        self.voice_enabled = voice_enabled
        self.history: List[dict] = []
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

        if self.api_key and genai is not None:
            genai.configure(api_key=self.api_key)

    def _mode_from_message(self, message: str) -> str:
        text = message.lower()

        if any(k in text for k in ["python", "pandas", "numpy", "flask", "django", "dataframe", "pip install", "jupyter"]):
            return "python"
        if any(k in text for k in ["debug", "bug", "error", "javascript", "react", "typescript", "code", "function", "class", "api"]):
            return "coding"
        if any(k in text for k in ["homework", "solve", "question", "math", "assignment", "exam", "study plan"]):
            return "homework"
        if any(k in text for k in ["explain", "teach", "what is", "why", "how does"]):
            return "teacher"
        return "friend"

    def _persona(self, mode: str) -> str:
        base = (
            f"You are {self.name}, a smart, warm, friendly AI study companion. "
            "Be supportive, encouraging, clear, and a little fun. "
            "Never act robotic. Talk like a helpful friend and mentor."
        )

        mode_map = {
            "friend": "Your job is emotional support, casual conversation, motivation, and balanced life advice.",
            "teacher": "Your job is concept teaching with simple explanations and real-world analogies.",
            "homework": "Your job is to guide step-by-step learning without doing the whole assignment for the student.",
            "coding": "Your job is to help debug code, explain logic, and write clean code in modern languages.",
            "python": "Your job is to help with Python basics, debugging, automation, data analysis, APIs, and clean Pythonic solutions.",
        }

        return f"{base} {mode_map.get(mode, mode_map['friend'])}"

    def _fallback_response(self, message: str, mode: str) -> str:
        text = message.strip()

        if not text:
            return "I’m here. Tell me what you want help with."

        if mode == "python":
            return (
                f"Absolutely — let’s tackle this in Python.\n\n"
                f"For: \"{text}\"\n\n"
                "Try breaking it into three steps:\n"
                "1. Understand the input and output\n"
                "2. Write the logic in simple Python\n"
                "3. Test a few edge cases\n\n"
                "Example:\n"
                "```python\ndef solve():\n    data = [1, 2, 3, 4]\n    return sum(data)\n\nprint(solve())\n```\n\n"
                "If you want, send me the exact problem or code and I’ll debug it step by step."
            )

        if mode == "coding":
            return (
                f"Okay, let’s reason this through.\n\n"
                f"Your prompt: \"{text}\"\n\n"
                "Start by identifying:\n"
                "- the input\n"
                "- the expected output\n"
                "- the edge cases\n\n"
                "Then write small testable functions instead of one giant block."
            )

        if mode == "homework":
            return (
                f"Let’s do this together, step by step.\n\n"
                f"For: \"{text}\"\n\n"
                "1. Write down what you know\n"
                "2. Identify the goal\n"
                "3. Pick the right formula or idea\n"
                "4. Solve one small piece at a time\n\n"
                "Send me your working and I’ll help check it, not just give the answer."
            )

        if mode == "teacher":
            return (
                f"Here’s the simple version: {text} is best understood by breaking it into the core idea, the key rule, and a quick example.\n\n"
                "Think of it like this: learn the concept, then connect it to a real example, then test yourself."
            )

        return (
            f"Hey, I’m here for you. {self.name} gets it — let’s think through it together.\n\n"
            f"You said: \"{text}\"\n\n"
            "Tell me more and I’ll help you break it into a clear plan."
        )

    def generate(self, message: str, mode: Optional[str] = None) -> str:
        selected_mode = (mode or self._mode_from_message(message) or "friend").lower()

        self.history.append({"role": "user", "content": message})

        if self.api_key and genai is not None:
            try:
                model = genai.GenerativeModel("gemini-2.0-flash")
                prompt = f"{self._persona(selected_mode)}\n\nUser says: {message}"
                response = model.generate_content(prompt)
                text = getattr(response, "text", None) or "I’m here to help."
                self.history.append({"role": "assistant", "content": text})
                return text.strip()
            except Exception:
                pass

        reply = self._fallback_response(message, selected_mode)
        self.history.append({"role": "assistant", "content": reply})
        return reply

    def speak(self, text: str) -> None:
        if not self.voice_enabled:
            return

        if pyttsx3 is not None:
            try:
                engine = pyttsx3.init()
                engine.say(text)
                engine.runAndWait()
                return
            except Exception:
                pass

        print(f"[{self.name} voice]: {text}")

    def listen(self) -> str:
        if sr is None:
            raise RuntimeError("Speech recognition is not installed")

        recognizer = sr.Recognizer()
        with sr.Microphone() as source:
            print("Listening... speak now.")
            audio = recognizer.listen(source)

        try:
            text = recognizer.recognize_google(audio)
            return text
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(f"Could not understand audio: {exc}") from exc


if __name__ == "__main__":
    bot = BuddyEngine(voice_enabled=False)
    while True:
        user_input = input("You: ")
        if user_input.strip().lower() in {"exit", "quit", "bye"}:
            print(f"{bot.name}: See you later!")
            break
        answer = bot.generate(user_input)
        print(f"{bot.name}: {answer}")
