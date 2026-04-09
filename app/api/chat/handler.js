import { convertToModelMessages, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getAuthUser } from '@/app/lib/authSession';
import db from '@/api/_lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

const AI_TUTOR_MODELS = {
  mini: process.env.OPENAI_AI_TUTOR_MODEL_MINI || 'gpt-4.1-mini',
  nano: process.env.OPENAI_AI_TUTOR_MODEL_NANO || 'gpt-4.1-nano',
};

async function ensureAiTutorSchema(sql) {
  await sql`
    ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS subtitle_text TEXT
  `;
  await sql`
    ALTER TABLE ai_conversations
    ADD COLUMN IF NOT EXISTS lesson_id BIGINT REFERENCES lessons (id) ON DELETE CASCADE
  `;
}

function extractMessageText(message) {
  if (!message) {
    return '';
  }

  if (typeof message.content === 'string') {
    return message.content.trim();
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part && (part.type === 'text' || part.type === 'input_text'))
      .map((part) => String(part.text || '').trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (!part) {
          return '';
        }

        if (typeof part === 'string') {
          return part;
        }

        return String(part.text || '');
      })
      .join('\n')
      .trim();
  }

  return '';
}

function formatStreamError(error) {
  const rawMessage = typeof error?.message === 'string'
    ? error.message
    : (typeof error === 'string' ? error : 'AI tutor request failed.');

  if (/api key/i.test(rawMessage) || /incorrect api key/i.test(rawMessage) || /invalid api key/i.test(rawMessage)) {
    return 'OpenAI API key is invalid or unavailable on the server.';
  }

  if (/quota/i.test(rawMessage) || /rate limit/i.test(rawMessage) || /429/.test(rawMessage)) {
    return 'OpenAI quota or rate limit was reached. Please try again later.';
  }

  if (/model/i.test(rawMessage) && /not found|access|permission/i.test(rawMessage)) {
    return 'The configured OpenAI model is not available for this API account.';
  }

  return rawMessage;
}

function jsonError(message, status, stage) {
  return new Response(JSON.stringify({ error: stage, message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Stage': stage,
    },
  });
}

export async function POST(req) {
  const requestId = Math.random().toString(36).slice(2, 10);

  try {
    const user = await getAuthUser();
    if (!user) {
      console.info(`[ai/chat ${requestId}] blocked: unauthorized`);
      return jsonError('Please sign in again before using the AI tutor.', 401, 'unauthorized');
    }

    const { messages = [], lessonId, courseId, modelKey: rawModelKey } = await req.json();
    const normalizedLessonId = Number.parseInt(String(lessonId || ''), 10);
    const modelKey = rawModelKey === 'nano' ? 'nano' : 'mini';
    const modelName = AI_TUTOR_MODELS[modelKey];
    console.info(`[ai/chat ${requestId}] start`, {
      userId: user.id,
      courseId,
      lessonId: normalizedLessonId,
      messages: Array.isArray(messages) ? messages.length : 0,
      modelKey,
      modelName,
    });

    if (!normalizedLessonId || !courseId) {
      console.info(`[ai/chat ${requestId}] blocked: missing_context`);
      return jsonError('Missing learning context for this AI request.', 400, 'missing_context');
    }

    const sql = db.getSql();
    await ensureAiTutorSchema(sql);
    const membershipTier = user.membershipTier || user.membership_tier || 'free';
    const limit = membershipTier === 'free' ? 3 : 50;

    // 1. Quota Check
    const countRes = await sql`
      SELECT COUNT(*) as msg_count 
      FROM ai_messages m 
      JOIN ai_conversations c ON m.conversation_id = c.id
      WHERE m.user_id = ${user.id} AND c.lesson_id = ${normalizedLessonId} AND m.role = 'user'
    `;
    
    const messagesSoFar = parseInt(countRes[0].msg_count, 10);

    if (messagesSoFar >= limit) {
       console.info(`[ai/chat ${requestId}] blocked: quota_exceeded`, {
         userId: user.id,
         lessonId: normalizedLessonId,
         messagesSoFar,
         limit,
       });
       return jsonError(
         membershipTier === 'free' ? 'You have used your 3 free AI queries for this lesson.' : 'You have reached the maximum 50 AI queries for this lesson.',
         403,
         'quota_exceeded'
       );
    }

    // 2. Load Subtitle Context
    const lessonRes = await sql`SELECT subtitle_text, title FROM lessons WHERE id = ${normalizedLessonId}`;
    const subtitle = lessonRes[0]?.subtitle_text || 'No transcript available for this lesson.';
    const lessonTitle = lessonRes[0]?.title || 'Unknown Lesson';
    const lastUserMessage = messages[messages.length - 1];
    const lastUserText = extractMessageText(lastUserMessage);

    if (!lastUserText) {
      console.info(`[ai/chat ${requestId}] blocked: empty_message`);
      return jsonError('Message content is required.', 400, 'empty_message');
    }

    if (!process.env.OPENAI_API_KEY) {
      console.info(`[ai/chat ${requestId}] blocked: openai_not_configured`);
      return jsonError('OPENAI_API_KEY is missing on the server.', 500, 'openai_not_configured');
    }

    // 3. Conversation Management (Find or create conversation)
    let convId;
    const convRes = await sql`
      SELECT id FROM ai_conversations 
      WHERE user_id = ${user.id} AND lesson_id = ${normalizedLessonId}
      LIMIT 1
    `;
    
    if (convRes.length > 0) {
      convId = convRes[0].id;
    } else {
      const newConv = await sql`
        INSERT INTO ai_conversations (user_id, course_id, lesson_id, title)
        VALUES (${user.id}, ${courseId}, ${normalizedLessonId}, ${'Chat about ' + lessonTitle})
        RETURNING id
      `;
      convId = newConv[0].id;
    }

    // 4. Save User Message
    await sql`
      INSERT INTO ai_messages (conversation_id, user_id, role, content, provider)
      VALUES (${convId}, ${user.id}, 'user', ${lastUserText}, 'openai')
    `;

    // 5. Generate AI Response
    console.info(`[ai/chat ${requestId}] calling_openai`, {
      userId: user.id,
      conversationId: convId,
      lessonId: normalizedLessonId,
      modelKey,
      modelName,
    });
    const result = await generateText({
      model: openai(modelName),
      system: `You are a helpful AI Chinese Mandarin tutor working in the TKU Learning System.
You are assisting a student with a specific lesson titled "${lessonTitle}".

***CRITICAL RULE***
Answer the student's questions strictly based on the following transcript of the lesson. 
If the student asks something completely unrelated to the lesson or transcript, politely decline to answer.

***TRANSCRIPT DATA***
${subtitle}
`,
      messages: await convertToModelMessages(messages),
    });
    const text = String(result.text || '').trim() || 'I received your question, but the model returned an empty response. Please try asking again with a little more detail.';

    await sql`
      INSERT INTO ai_messages (conversation_id, user_id, role, content, provider)
      VALUES (${convId}, ${user.id}, 'assistant', ${text}, 'openai')
    `;

    console.info(`[ai/chat ${requestId}] openai_finished`, {
      conversationId: convId,
      chars: text.length,
      finishReason: result.finishReason || 'unknown',
      modelKey,
      modelName,
    });

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-AI-Stage': 'openai_complete',
        'X-AI-Model-Key': modelKey,
        'X-AI-Model-Name': modelName,
      },
    });
  } catch (error) {
    console.error(`[ai/chat ${requestId}] fatal:`, error);
    return jsonError(formatStreamError(error), 500, 'chat_error');
  }
}
