import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, bookContext } = await request.json();

    // Format the conversation for Claude
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const stream = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      system: `You are an AI reading assistant helping with the following book content:
${bookContext}

Please help answer questions about this content, explain concepts, and provide insights.`,
      messages: formattedMessages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let accumulatedText = '';
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              const deltaText = chunk.delta?.text || '';
              accumulatedText += deltaText;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  content: deltaText,
                  done: false 
                })}\n\n`)
              );
            }
          }
          // Send final message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              content: '', 
              done: true,
              finalMessage: accumulatedText
            })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error calling Claude:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get response from Claude',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
