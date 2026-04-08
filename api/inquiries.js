var db = require('./_lib/db');
var errors = require('./_lib/errors');
var http = require('./_lib/http');
var mail = require('./_lib/mail');
var origin = require('./_lib/origin');
var rateLimit = require('./_lib/rateLimit');

module.exports = async function(req, res) {
    var body;
    var name;
    var email;
    var organization;
    var country;
    var interest;
    var message;
    var website;
    var locale;
    var page;
    var sql;
    var safeOrg;
    var safeCountry;
    var notifyHtml;
    var confirmationHtml;
    var responseMessage;
    var escapedName;
    var escapedEmail;
    var escapedInterest;
    var escapedMessage;
    var escapedOrg;
    var escapedCountry;
    var ipAddress;
    var rateResult;

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        http.allowMethods(res, ['POST', 'OPTIONS']);
        errors.jsonError(req, res, 405, 'Method not allowed');
        return;
    }

    if (!process.env.DATABASE_URL) {
        errors.jsonError(req, res, 503, 'Service is not configured right now.');
        return;
    }

    if (!origin.requireTrustedOrigin(req, res, errors)) {
        return;
    }

    body = http.parseBody(req);
    name = http.sanitize(body.name, 100);
    email = http.sanitize(body.email, 160).toLowerCase();
    organization = http.sanitize(body.organization, 160);
    country = http.sanitize(body.country, 120);
    interest = http.sanitize(body.interest, 80);
    message = http.sanitize(body.message, 2000);
    website = http.sanitize(body.website, 120);
    locale = http.sanitize(body.locale, 20);
    page = http.sanitize(body.page, 40);

    if (website) {
        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            message: 'Thanks, your request has been received.'
        });
        return;
    }

    if (!name || !email || !interest || !message) {
        errors.jsonError(req, res, 400, 'Please complete the required fields.');
        return;
    }

    if (!http.validateEmail(email)) {
        errors.jsonError(req, res, 400, 'Please enter a valid email address.');
        return;
    }

    try {
        sql = db.getSql();
        ipAddress = http.getClientIp(req);

        rateResult = await rateLimit.enforceRateLimit(sql, {
            bucket: 'inquiry_ip',
            scopeKey: rateLimit.buildKey([ipAddress]),
            limit: 6,
            windowSeconds: 60 * 60,
            metadata: { ip: ipAddress, email: email, page: page }
        });

        if (!rateResult.ok) {
            errors.jsonError(req, res, 429, 'Too many inquiry attempts. Please try again later.');
            return;
        }

        await sql`
            INSERT INTO inquiries (
                name,
                email,
                organization,
                country,
                interest,
                message,
                locale,
                source_page
            )
            VALUES (
                ${name},
                ${email},
                ${organization || null},
                ${country || null},
                ${interest},
                ${message},
                ${locale || null},
                ${page || null}
            )
        `;

        responseMessage = 'Thanks, your inquiry has been sent. We will get back to you soon.';

        if (process.env.RESEND_API_KEY && process.env.CONTACT_NOTIFY_EMAIL) {
            try {
                safeOrg = organization || 'N/A';
                safeCountry = country || 'N/A';
                escapedName = http.escapeHtml(name);
                escapedEmail = http.escapeHtml(email);
                escapedInterest = http.escapeHtml(interest);
                escapedMessage = http.escapeHtml(message).replace(/\n/g, '<br>');
                escapedOrg = http.escapeHtml(safeOrg);
                escapedCountry = http.escapeHtml(safeCountry);
                notifyHtml = `
                    <h2>New TKCLCLAB inquiry</h2>
                    <p><strong>Name:</strong> ${escapedName}</p>
                    <p><strong>Email:</strong> ${escapedEmail}</p>
                    <p><strong>Organization:</strong> ${escapedOrg}</p>
                    <p><strong>Country:</strong> ${escapedCountry}</p>
                    <p><strong>Interest:</strong> ${escapedInterest}</p>
                    <p><strong>Locale:</strong> ${http.escapeHtml(locale || 'N/A')}</p>
                    <p><strong>Page:</strong> ${http.escapeHtml(page || 'N/A')}</p>
                    <p><strong>Message:</strong></p>
                    <p>${escapedMessage}</p>
                `;
                await mail.sendEmail({
                    to: process.env.CONTACT_NOTIFY_EMAIL,
                    subject: 'New inquiry from ' + name,
                    html: notifyHtml,
                    replyTo: email
                });

                confirmationHtml = `
                    <p>Hi ${escapedName},</p>
                    <p>Thanks for contacting TKCLCLAB. We received your inquiry and will reply soon.</p>
                    <p><strong>Your topic:</strong> ${escapedInterest}</p>
                    <p>Best regards,<br>TKCLCLAB</p>
                `;
                await mail.sendEmail({
                    to: email,
                    subject: 'We received your TKCLCLAB inquiry',
                    html: confirmationHtml,
                    replyTo: process.env.CONTACT_NOTIFY_EMAIL
                });
            } catch (_error) {
                responseMessage = 'Thanks, your inquiry was saved successfully. Email notifications are temporarily delayed.';
            }
        }

        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            message: responseMessage
        });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to submit inquiry right now.', 500, 'inquiries.create');
    }
};
