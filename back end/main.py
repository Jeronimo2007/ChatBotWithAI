from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import httpx
import asyncio
import json

app = FastAPI()

OPENROUTER_API_KEY = "TU_API_KEY"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "meta-llama/llama-3-8b-instruct"


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)  
            messages = convert_messages(data["messages"])

            await stream_openrouter_response(messages, websocket)
            await websocket.send_text("__END__")
    except WebSocketDisconnect:
        print("Cliente desconectado")
    except Exception as e:
        print("Error:", e)


def convert_messages(raw_messages: list):
    converted = []
    for msg in raw_messages:
        if msg["from"] == "me":
            converted.append({"role": "user", "content": msg["text"]})
        else:
            converted.append({"role": "assistant", "content": msg["text"]})
    return [{"role": "system", "content": "Eres una IA útil que responde en español."}] + converted


async def stream_openrouter_response(messages, websocket: WebSocket):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Chat Contextual IA"
    }

    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "stream": True
    }

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", OPENROUTER_URL, headers=headers, json=payload) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[len("data: "):]
                    if chunk == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        content = data["choices"][0]["delta"].get("content")
                        if content:
                            await websocket.send_text(content)
                            await asyncio.sleep(0.01)
                    except Exception as e:
                        print("Error procesando chunk:", e)
