import { convertToModelMessages, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getAuthUser } from '@/app/lib/authSession';
import db from '@/api/_lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

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

export async function POST(req) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { messages = [], lessonId, courseId } = await req.json();
    const normalizedLessonId = Number.parseInt(String(lessonId || ''), 10);

    if (!normalizedLessonId || !courseId) {
      return new Response(JSON.stringify({ error: 'Missing learning context' }), { status: 400 });
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
       return new Response(
         JSON.stringify({ 
           error: 'QUOTA_EXCEEDED', 
           message: membershipTier === 'free' ? 'You have used your 3 free AI queries for this lesson.' : 'You have reached the maximum 50 AI queries for this lesson.' 
         }), 
         { status: 403 }
       );
    }

    // 2. Load Subtitle Context
    const lessonRes = await sql`SELECT subtitle_text, title FROM lessons WHERE id = ${normalizedLessonId}`;
    const subtitle = lessonRes[0]?.subtitle_text || 'No transcript available for this lesson.';
    const lessonTitle = lessonRes[0]?.title || 'Unknown Lesson';
    const lastUserMessage = messages[messages.length - 1];
    const lastUserText = extractMessageText(lastUserMessage);

    if (!lastUserText) {
      return new Response(JSON.stringify({ error: 'Message content is required.' }), { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_NOT_CONFIGURED', message: 'OPENAI_API_KEY is missing on the server.' }),
        { status: 500 }
      );
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
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: `You are a helpful AI Chinese Mandarin tutor working in the TKU Learning System.
You are assisting a student with a specific lesson titled "${lessonTitle}".

***CRITICAL RULE***
Answer the student's questions strictly based on the following transcript of the lesson. 
If the student asks something completely unrelated to the lesson or transcript, politely decline to answer.

***TRANSCRIPT DATA***
${subtitle}
`,
      messages: convertToModelMessages(messages),
      onFinish: async ({ text }) => {
        // Automatically save AI response after stream completes
        const finishSql = db.getSql();
        await finishSql`
          INSERT INTO ai_messages (conversation_id, user_id, role, content, provider)
          VALUES (${convId}, ${user.id}, 'assistant', ${text}, 'openai')
        `;
      }
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
