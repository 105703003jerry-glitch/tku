var auth = require('../_lib/auth');
var courseStore = require('../_lib/courseStore');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');
var origin = require('../_lib/origin');
var rateLimit = require('../_lib/rateLimit');

function buildTutorPrompt(courseId, history) {
    var lines = [
        'You are the TKCLCLAB learning coach.',
        'Respond in a warm, concise, practical teaching style.',
        'When helpful, include Mandarin examples with English explanations.',
        'Keep answers under 220 words unless the learner asks for depth.',
        'Course context: ' + (courseId || 'general Mandarin learning')
    ];

    if (history.length) {
        lines.push('Recent conversation:');
        history.forEach(function(item) {
            lines.push(item.role + ': ' + item.content);
        });
    }

    return lines.join('\n');
}

function fallbackReply(courseId, message) {
    var topic = (courseId || 'your study track').replace(/[-_]/g, ' ');
    return 'I can still help even before the live AI model is configured. For ' + topic + ', try this next: 1. restate the key idea in your own words, 2. write one Mandarin example sentence, 3. review it aloud three times, and 4. note one question to ask your teacher. Your latest question was: "' + message + '". Once OPENAI_API_KEY is added, this tutor will switch to live model responses.';
}

async function generateWithOpenAI(courseId, history) {
    var response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-5.2',
            instructions: 'You are a Mandarin learning coach for TKCLCLAB. Answer clearly, safely, and helpfully for language learners.',
            input: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: buildTutorPrompt(courseId, history)
                        }
                    ]
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error('OpenAI request failed');
    }

    return response.json();
}

function getUsageTokens(aiResponse, key) {
    if (!aiResponse || !aiResponse.usage) {
        return null;
    }

    return aiResponse.usage[key] || null;
}

module.exports = async function(req, res) {
    var sql;
    var session;
    var body;
    var courseId;
    var conversationId;
    var message;
    var existingConversation;
    var history;
    var createdConversation;
    var aiResponse;
    var answer;
    var provider;
    var assistantMessage;
    var ipAddress;
    var rateResult;
    var quota;
    var modelName;

    if (req.method !== 'POST') {
        http.allowMethods(res, ['POST']);
        errors.jsonError(req, res, 405, 'Method not allowed');
        return;
    }

    if (!origin.requireTrustedOrigin(req, res, errors)) {
        return;
    }

    try {
        sql = db.getSql();
        session = await auth.getSessionUser(sql, req);

        if (!session) {
            errors.jsonError(req, res, 401, 'Please sign in first.');
            return;
        }

        body = http.parseBody(req);
        courseId = http.sanitize(body.courseId, 80) || null;
        conversationId = parseInt(body.conversationId, 10) || null;
        message = http.sanitize(body.message, 2000);
        ipAddress = http.getClientIp(req);
        modelName = process.env.OPENAI_MODEL || 'gpt-5.2';

        if (!message) {
            errors.jsonError(req, res, 400, 'message is required.');
            return;
        }

        if (courseId && !(await courseStore.courseExists(sql, courseId))) {
            errors.jsonError(req, res, 404, 'Course not found.');
            return;
        }

        rateResult = await rateLimit.enforceRateLimit(sql, {
            bucket: 'ai_chat_ip',
            scopeKey: rateLimit.buildKey([ipAddress]),
            limit: 20,
            windowSeconds: 60 * 60,
            metadata: { ip: ipAddress, userId: session.user.id, courseId: courseId }
        });

        if (!rateResult.ok) {
            errors.jsonError(req, res, 429, 'Too many AI requests. Please try again later.');
            return;
        }

        quota = await rateLimit.getAiQuota(sql, session.user.id, 30);
        if (quota.remaining <= 0) {
            errors.jsonError(req, res, 429, 'Daily AI quota reached. Please try again tomorrow.');
            return;
        }

        if (conversationId) {
            existingConversation = await sql`
                SELECT id
                FROM ai_conversations
                WHERE id = ${conversationId}
                  AND user_id = ${session.user.id}
                LIMIT 1
            `;

            if (!existingConversation.length) {
                errors.jsonError(req, res, 404, 'Conversation not found.');
                return;
            }

            await sql`
                UPDATE ai_conversations
                SET status = 'active',
                    updated_at = NOW()
                WHERE id = ${conversationId}
            `;
        } else {
            createdConversation = await sql`
                WITH created AS (
                    INSERT INTO ai_conversations (
                        user_id,
                        course_id,
                        title,
                        status,
                        provider,
                        model,
                        last_message_at
                    )
                    VALUES (
                        ${session.user.id},
                        ${courseId},
                        ${message.slice(0, 80)},
                        'active',
                        ${process.env.OPENAI_API_KEY ? 'openai' : 'fallback'},
                        ${modelName},
                        NOW()
                    )
                    RETURNING id
                ),
                inserted_message AS (
                    INSERT INTO ai_messages (
                        conversation_id,
                        user_id,
                        role,
                        content,
                        provider
                    )
                    SELECT
                        id,
                        ${session.user.id},
                        'user',
                        ${message},
                        'user'
                    FROM created
                )
                SELECT id FROM created
            `;
            conversationId = createdConversation[0].id;
        }

        if (existingConversation && existingConversation.length) {
            await sql`
                INSERT INTO ai_messages (
                    conversation_id,
                    user_id,
                    role,
                    content,
                    provider
                )
                VALUES (
                    ${conversationId},
                    ${session.user.id},
                    'user',
                    ${message},
                    'user'
                )
            `;
        }

        history = await sql`
            SELECT role, content
            FROM ai_messages
            WHERE conversation_id = ${conversationId}
            ORDER BY created_at DESC
            LIMIT 8
        `;

        history.reverse();
        provider = 'fallback';
        answer = fallbackReply(courseId, message);
        aiResponse = null;

        if (process.env.OPENAI_API_KEY) {
            try {
                aiResponse = await generateWithOpenAI(courseId, history);
                answer = aiResponse.output_text || answer;
                provider = 'openai';
            } catch (_error) {
                provider = 'fallback';
                answer = fallbackReply(courseId, message);
            }
        }

        assistantMessage = await sql`
            WITH inserted_message AS (
                INSERT INTO ai_messages (
                    conversation_id,
                    user_id,
                    role,
                    content,
                    provider
                )
                VALUES (
                    ${conversationId},
                    ${session.user.id},
                    'assistant',
                    ${answer},
                    ${provider}
                )
                RETURNING id, content, created_at
            ),
            usage_row AS (
                INSERT INTO ai_usage_logs (
                    user_id,
                    conversation_id,
                    message_id,
                    provider,
                    model,
                    input_tokens,
                    output_tokens,
                    estimated_cost,
                    status
                )
                SELECT
                    ${session.user.id},
                    ${conversationId},
                    id,
                    ${provider},
                    ${modelName},
                    ${getUsageTokens(aiResponse, 'input_tokens')},
                    ${getUsageTokens(aiResponse, 'output_tokens')},
                    NULL,
                    ${provider === 'openai' ? 'succeeded' : 'fallback'}
                FROM inserted_message
            ),
            updated_conversation AS (
                UPDATE ai_conversations
                SET updated_at = NOW(),
                    last_message_at = NOW(),
                    status = 'active',
                    provider = ${provider},
                    model = ${modelName}
                WHERE id = ${conversationId}
            )
            SELECT id, content, created_at
            FROM inserted_message
        `;

        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            conversationId: conversationId,
            provider: provider,
            message: assistantMessage[0],
            quotaRemaining: quota.remaining - 1
        });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to generate tutor response right now.', 500, 'ai.chat');
    }
};
