/**
 * SMS Delivery Provider Service
 * Connects with server-side Twilio REST API or Webhook.
 * Validates country code phone formatting.
 * Never reports as sent unless confirmed by provider.
 */

export const isSmsConfigured = () => {
  return Boolean(
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) ||
    process.env.SMS_WEBHOOK_URL
  );
};

export const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  const cleaned = String(phone).replace(/[\s-]/g, '');
  return /^\+?[1-9]\d{7,14}$/.test(cleaned);
};

export const formatE164 = (phone) => {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[\s-]/g, '');
  if (!cleaned.startsWith('+') && cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return cleaned;
};

export const sendSmsNotification = async ({
  to,
  message,
  metadata = {}
}) => {
  // 1. Phone number validation
  const cleanPhone = (to || '').trim();
  const phoneRegex = /^\+?[1-9]\d{7,14}$/; // E.164 international standard format
  if (!cleanPhone || !phoneRegex.test(cleanPhone.replace(/[\s-]/g, ''))) {
    return {
      success: false,
      status: 'failed',
      error: 'Invalid phone number. Please include valid country code (e.g. +91 9876543210 or +1 5551234567).',
      attemptedAt: new Date().toISOString()
    };
  }

  // 2. Check provider configuration
  if (!isSmsConfigured()) {
    // If explicitly in test sandbox simulation mode (for unit testing)
    if (process.env.ALLOW_TEST_SIMULATION === 'true') {
      return {
        success: true,
        status: 'simulated_sandbox',
        providerMessageId: `sim-sms-${Date.now()}`,
        provider: 'Local SMS Sandbox Simulator',
        attemptedAt: new Date().toISOString()
      };
    }

    return {
      success: false,
      sent: false,
      status: 'provider_not_configured',
      error: 'SMS provider not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in server/.env.',
      attemptedAt: new Date().toISOString()
    };
  }

  // 3. Real Twilio API Call
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const params = new URLSearchParams();
      params.append('To', cleanPhone.replace(/[\s-]/g, ''));
      params.append('From', process.env.TWILIO_PHONE_NUMBER);
      params.append('Body', message);

      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();

      if (response.ok && data.sid) {
        return {
          success: true,
          status: data.status || 'sent',
          providerMessageId: data.sid,
          provider: 'Twilio SMS',
          attemptedAt: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          status: 'failed',
          error: data.message || `Twilio error code ${data.code || response.status}`,
          attemptedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        error: `Network error reaching SMS gateway: ${err.message}`,
        attemptedAt: new Date().toISOString()
      };
    }
  }

  // 4. Custom SMS Webhook
  if (process.env.SMS_WEBHOOK_URL) {
    try {
      const response = await fetch(process.env.SMS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanPhone, message, metadata })
      });
      if (response.ok) {
        return {
          success: true,
          status: 'sent',
          providerMessageId: `sms-webhook-${Date.now()}`,
          provider: 'Custom SMS Gateway',
          attemptedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        error: `SMS Gateway error: ${err.message}`,
        attemptedAt: new Date().toISOString()
      };
    }
  }

  return {
    success: false,
    status: 'provider_not_configured',
    error: 'Configured SMS provider driver could not be initialized.',
    attemptedAt: new Date().toISOString()
  };
};

export const sendSmsAlert = sendSmsNotification;
