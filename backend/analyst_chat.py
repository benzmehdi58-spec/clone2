import os
import json
import httpx
from typing import Dict, Any, AsyncGenerator

from analyst_cache import _get_api_keys

RAG_SYSTEM_PROMPT = """You are a security analyst assistant integrated into a SIEM/NIDS platform. Answer questions strictly based on the document excerpts provided in the CONTEXT section.

Rules you MUST follow without exception:
- Only use information explicitly present in the CONTEXT section.
- If the context does not contain sufficient information, say exactly: "The uploaded documents do not contain sufficient information to answer this question."
- Do NOT invent CVEs, IP addresses, hostnames, attack procedures, or any security data not present in context.
- Always cite the source document filename for every claim you make.
- Be concise, precise, and actionable. Analysts need accurate answers fast.
- Never use your training knowledge — only the provided context."""

def get_openrouter_api_key():
    keys = _get_api_keys()
    return keys.get("OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY")

async def classify_and_rewrite(question: str) -> Dict[str, Any]:
    # Local fast-path check for common greetings
    clean_q = question.strip().lower().rstrip("?.!")
    greetings = {"hello", "hi", "hey", "hola", "bonjour", "greetings", "good morning", "good afternoon", "good evening"}
    if clean_q in greetings:
        return {"intent": "greeting", "rewritten_query": question, "follow_up_questions": []}

    api_key = get_openrouter_api_key()
    if not api_key:
        return {"intent": "rag", "rewritten_query": question, "follow_up_questions": []}
        
    prompt = f"""Analyze this user question and respond ONLY with a JSON object (no markdown, no explanation):
{{
  "intent": "rag" | "greeting" | "other",
  "rewritten_query": "<improved version of the question optimized for document retrieval>",
  "follow_up_questions": ["<question 1>", "<question 2>"]
}}

Rules:
- intent = "greeting" if the message is a salutation or small talk (hi, hello, how are you, etc.)
- intent = "other" if the question cannot be answered from security documents
- intent = "rag" for everything else
- rewritten_query: expand acronyms, add relevant synonyms, make it more specific
- follow_up_questions: two natural follow-up questions an analyst might ask next

User question: {question}"""

    messages = [{"role": "user", "content": prompt}]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}", 
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-3-8b-instruct", 
                    "messages": messages,
                    "max_tokens": 200,
                    "response_format": {"type": "json_object"}
                },
                timeout=10
            )
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            result = json.loads(content)
            return {
                "intent": result.get("intent", "rag"),
                "rewritten_query": result.get("rewritten_query", question),
                "follow_up_questions": result.get("follow_up_questions", [])
            }
    except Exception as e:
        print(f"Classification error: {e}")
        return {"intent": "rag", "rewritten_query": question, "follow_up_questions": []}

async def stream_answer(question: str, context_chunks: list, conversation_history: list) -> AsyncGenerator[str, None]:
    api_key = get_openrouter_api_key()
    
    # Format chunks
    formatted_chunks = ""
    for idx, c in enumerate(context_chunks):
        formatted_chunks += f"Document: {c['filename']} (chunk {c['chunk_index']})\nText:\n{c['content']}\n\n"
        
    user_prompt = f"CONTEXT:\n{formatted_chunks}\n\nQUESTION:\n{question}"
    
    messages = [{"role": "system", "content": RAG_SYSTEM_PROMPT}]
    
    # Add history (last 6 turns = last 6 messages)
    for msg in conversation_history[-6:]:
        messages.append({"role": "user" if msg["is_user"] else "assistant", "content": msg["content"]})
        
    messages.append({"role": "user", "content": user_prompt})
    
    if not api_key:
        yield "Error: OPENROUTER_API_KEY is not configured."
        return

    try:
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", 
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}", 
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-3-8b-instruct", 
                    "messages": messages, 
                    "stream": True, 
                    "max_tokens": 1024
                },
                timeout=60
            ) as response:
                if response.status_code != 200:
                    text = await response.aread()
                    yield f"API Error ({response.status_code}): {text.decode('utf-8')}"
                    return
                    
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            chunk = json.loads(line[6:])
                            token = chunk["choices"][0]["delta"].get("content", "")
                            if token:
                                yield token
                        except:
                            pass
    except Exception as e:
        # Fallback to gemma
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST", 
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}", 
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "google/gemma-2-9b-it", 
                        "messages": messages, 
                        "stream": True, 
                        "max_tokens": 1024
                    },
                    timeout=60
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: ") and line != "data: [DONE]":
                            try:
                                chunk = json.loads(line[6:])
                                token = chunk["choices"][0]["delta"].get("content", "")
                                if token:
                                    yield token
                            except:
                                pass
        except Exception as fallback_e:
            yield f"Error generating response: {fallback_e}"
