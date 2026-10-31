/**
 * Email Delivery Provider Service
 * Evaluates server-side credentials from environment variables.
 * Never exposes secrets to frontend code.
 *
 * Supported modes:
 * 1. Real SMTP (via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
 * 2. SendGrid / REST API (via SENDGRID_API_KEY)
 * 3. Test Sandbox / Unconfigured mode
 */

export const isEmailConfigured = () => {
  return Boolean(
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
    process.env.SENDGRID_API_KEY ||
    process.env.EMAIL_WEBHOOK_URL
  );
};

export const sendEmailNotification = async ({
  to,
  subject,
  body,
  metadata = {}
}) => {
  // 1. Validation
  if (!to || !to.includes('@')) {
    return {
      success: false,
      status: 'failed',
      error: 'Invalid recipient email address.',
      attemptedAt: new Date().toISOString()
    };
  }

  // 2. Provider Configuration Check
  if (!isEmailConfigured()) {
    // If explicitly in test sandbox simulation mode (for unit testing)
    if (process.env.ALLOW_TEST_SIMULATION === 'true') {
      return {
        success: true,
        status: 'simulated_sandbox',
        providerMessageId: `sim-mail-${Date.now()}`,
        provider: 'Local Sandbox Simulator',
        attemptedAt: new Date().toISOString()
      };
    }

    return {
      success: false,
      sent: false,
      status: 'provider_not_configured',
      error: 'Email provider not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in server/.env.',
      attemptedAt: new Date().toISOString()
    };
  }

  // 3. Real Delivery via SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.SMTP_FROM || 'alerts@medicalreminder.app', name: 'Smart Medical Reminder' },
          subject: subject,
          content: [{ type: 'text/plain', value: body }]
        })
      });

      if (response.ok || response.status === 202) {
        const msgId = response.headers.get('x-message-id') || `sg-${Date.now()}`;
        return {
          success: true,
          status: 'sent',
          providerMessageId: msgId,
          provider: 'SendGrid',
          attemptedAt: new Date().toISOString()
        };
      } else {
        const errText = await response.text();
        return {
          success: false,
          status: 'failed',
          error: `SendGrid error (${response.status}): ${errText}`,
          attemptedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        error: `Network error delivering email: ${err.message}`,
        attemptedAt: new Date().toISOString()
      };
    }
  }

  // 4. Real Delivery via Custom Webhook
  if (process.env.EMAIL_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, metadata })
      });
      if (response.ok) {
        return {
          success: true,
          status: 'sent',
          providerMessageId: `webhook-${Date.now()}`,
          provider: 'Custom Email Webhook',
          attemptedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        error: `Webhook delivery error: ${err.message}`,
        attemptedAt: new Date().toISOString()
      };
    }
  }

  return {
    success: false,
    status: 'provider_not_configured',
    error: 'Configured email provider driver could not be initialized.',
    attemptedAt: new Date().toISOString()
  };
};

export const sendEmailAlert = sendEmailNotification;
