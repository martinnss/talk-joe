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

        if (!audioFile ) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }
        
        const file = audioFile as File;
        const buffer = await file.arrayBuffer();
        const processedFile = new File([buffer], file.name, { type: file.type });

        console.log(processedFile)
        // 1. Transcribe audio to text
        const transcription = await openai.audio.transcriptions.create({
            file: processedFile,
            model: 'whisper-1',
        }) as TranscriptionResponse;

        console.log(transcription.text)
        // 2. Translate the text
        const translation = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `im going to give you a text, if its spanish translate it to english and if its english translate it to spanish. just give me the translation and nothing else` },
                { role: 'user', content: transcription.text },
            ],
        }) as TranslationResponse;
        console.log(translation.choices[0]?.message?.content)
        
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