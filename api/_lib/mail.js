async function sendEmail(payload) {
    var apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        return null;
    }

    var response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'TKCLCLAB <onboarding@resend.dev>',
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            reply_to: payload.replyTo || undefined
        })
    });

    if (!response.ok) {
        throw new Error('Resend error: ' + (await response.text()));
    }

    return response.json();
}

module.exports = {
    sendEmail: sendEmail
};
