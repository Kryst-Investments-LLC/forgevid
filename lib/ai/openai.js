import OpenAI from 'openai';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
export async function generateVideoScript(prompt) {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            {
                role: 'system',
                content: 'You are a professional video script writer. Create engaging, concise scripts for video content.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        max_tokens: 1000,
    });
    return completion.choices[0]?.message?.content || '';
}
export async function generateVideoSummary(transcript) {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            {
                role: 'system',
                content: 'You are a video content analyzer. Create concise, engaging summaries of video transcripts.',
            },
            {
                role: 'user',
                content: `Summarize this video transcript: ${transcript}`,
            },
        ],
        max_tokens: 500,
    });
    return completion.choices[0]?.message?.content || '';
}
export async function generateVideoTitle(description) {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            {
                role: 'system',
                content: 'You are a video marketing expert. Create compelling, SEO-friendly video titles.',
            },
            {
                role: 'user',
                content: `Create a title for this video: ${description}`,
            },
        ],
        max_tokens: 100,
    });
    return completion.choices[0]?.message?.content || '';
}
