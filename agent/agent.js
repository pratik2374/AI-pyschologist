
import { defineAgent, cli, ServerOptions, voice } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables from the project root .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ARIA_VOICE_INSTRUCTIONS = `You are Dr. Aria, a deeply compassionate, grounded, and insightful psychologist.

VOICE GUIDELINES FOR THERAPY SESSIONS:
1. Warmth & Presence: Speak with a calm, gentle, empathetic, and unhurried human voice.
2. Conversational Length: In real-time voice conversations, avoid long monologues. Keep each response concise (typically 1 to 3 thoughtful sentences) so the conversation feels like a natural therapeutic dialogue.
3. Therapeutic Style: Validate emotions first, reflect what you hear, and gently ask open-ended questions that invite deeper reflection.
4. Spoken Delivery: Never use markdown formatting (no asterisks, bolding, bullet points, numbered lists, or headers). Speak only in natural spoken English.
5. Safety: If the client expresses acute distress or thoughts of self-harm, respond with immediate compassion, provide crisis helpline guidance, and prioritize their emotional safety.`;

export default defineAgent({
  prewarm: async (proc) => {
    try {
      proc.userData.vad = await silero.VAD.load();
    } catch (err) {
      console.warn('[Dr. Aria Agent] Prewarm VAD warning:', err.message);
    }
  },

  entry: async (ctx) => {
    console.log(`[Dr. Aria Agent] Connecting to room: ${ctx.room.name}`);
    await ctx.connect();

    const vad = ctx.proc.userData.vad || (await silero.VAD.load({
      minSpeechDuration: 0.1,
      minSilenceDuration: 0.8, // Wait longer before considering the turn ended to prevent interruptions
      prefixPaddingDuration: 0.1,
      maxBufferedSpeech: 60,
      activationThreshold: 0.5,
      sampleRate: 16000,
      forceCPU: false,
    }));

    const session = new voice.AgentSession({
      vad,
      turnDetector: voice.createEndpointing({ timeout: 1.0 }), // wait 1 second of silence before replying
      stt: new openai.STT({ model: 'whisper-1' }),
      llm: new openai.LLM({
        model: process.env.OPENAI_MAIN_MODEL || 'gpt-4o',
        temperature: 0.85, // Higher temperature for more human-like, varied responses
      }),
      tts: new openai.TTS({
        model: 'tts-1',
        voice: 'nova', // Warm, soothing, empathetic voice for Dr. Aria
      }),
    });

    const agent = new voice.Agent({
      instructions: ARIA_VOICE_INSTRUCTIONS,
    });

    await session.start({
      agent,
      room: ctx.room,
    });

    // Warm greeting when patient joins the voice room
    session.say("Hello. I'm Dr. Aria. Take all the time you need — I'm right here with you.");
  },
});

// Run the agent CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(new ServerOptions({
    agent: fileURLToPath(import.meta.url),
  }));
}
