// app/api/openai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

interface TranscriptionResponse {
    text: string;
}

interface TranslationResponse {
    choices: {
        message?: {
            content: string;
        };
    }[];
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audioData');
        const targetLanguage = formData.get('targetLanguage');

        if (!audioFile || !targetLanguage) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Convert FormData file to a Node.js File-like object
        const buffer = await (audioFile as File).arrayBuffer();
        const file = new File([buffer], 'audio.wav', { type: 'audio/wav' });

        // 1. Transcribe audio to text
        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
        }) as TranscriptionResponse;

        // 2. Translate the text
        const translation = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: `Translate the following text to ${targetLanguage}:` },
                { role: 'user', content: transcription.text },
            ],
        }) as TranslationResponse;

        return NextResponse.json({
            transcription: transcription.text,
            translation: translation.choices[0]?.message?.content,
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unexpected error occurred' },
            { status: 500 }
        );
    }
}