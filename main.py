import os
import sys
from engine import BuddyEngine


def main() -> None:
    print("Buddy AI — local Python assistant")
    print("Type 'exit' to quit.\n")

    bot = BuddyEngine(name="Buddy")

    while True:
        try:
            user_input = input("You: ").strip()
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break

        if not user_input:
            continue

        if user_input.lower() in {"exit", "quit", "bye"}:
            print("Buddy: See you later!")
            break

        response = bot.generate(user_input)
        print(f"Buddy: {response}\n")


if __name__ == "__main__":
    main()
