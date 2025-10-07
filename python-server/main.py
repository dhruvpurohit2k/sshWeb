from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel
import subprocess
import tempfile
import os

# Initialize FastAPI
app = FastAPI(title="Local Voice to UNIX Command API")

# Load Whisper model once (you can choose size: tiny, base, small, medium, large-v3)
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")


@app.post("/voice-to-command")
async def voice_to_command(file: UploadFile = File(...)):
    try:
        # Save uploaded audio temporarily
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_audio:
            temp_audio.write(await file.read())
            temp_audio_path = temp_audio.name

        # Step 1: Transcribe using faster-whisper
        segments, _ = whisper_model.transcribe(temp_audio_path)
        transcription = " ".join([seg.text.strip() for seg in segments]).strip()
        print(f"🎙️ Transcribed: {transcription}")

        # Step 2: Use Ollama to convert text → UNIX command
        prompt = f"Convert this instruction into a valid Unix shell command:\n\n{transcription}\n\n . Only return the command in a single line with no quotes."
        result = subprocess.run(
            ["ollama", "run", "phi3", prompt], capture_output=True, text=True
        )

        command = result.stdout.strip()
        command = (
            command.replace("```bash", "")
            .replace("```bash\n", "")
            .replace("```", "")
            .strip()
        )
        print(f"💻 Command: {command}")

        return JSONResponse(
            content={"transcription": transcription, "command": command}
        )

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
