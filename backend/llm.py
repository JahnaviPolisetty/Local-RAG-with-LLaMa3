from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

from config import settings


class LLMError(Exception):
    pass


SYSTEM_PROMPT = """You are a precise document question-answering assistant.
Answer only from the provided context. If the answer is not present, say that
the indexed documents do not contain enough relevant information. Cite source
filenames when possible."""


def generate_answer(question: str, context: str) -> str:
    try:
        llm = ChatOllama(
            model=settings.llm_model,
            base_url=settings.ollama_base_url,
            temperature=0.1,
        )
        response = llm.invoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(
                    content=(
                        "Context:\n"
                        f"{context}\n\n"
                        "Question:\n"
                        f"{question}\n\n"
                        "Answer:"
                    )
                ),
            ]
        )
        answer = str(response.content).strip()
        if not answer:
            raise LLMError("The language model returned an empty response.")
        return answer
    except LLMError:
        raise
    except Exception as exc:
        raise LLMError(
            "Llama 3 generation failed. Confirm Ollama is running and "
            f"the '{settings.llm_model}' model is installed."
        ) from exc
