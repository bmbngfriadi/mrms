const axios = require('axios');
const env = require('../../../config/env');

class HttpWhatsAppProvider {
  constructor() {
    this.name = 'HttpWhatsAppProvider';
  }

  async sendMessage({ to, message }) {
    if (!env.WA_API_URL || !env.WA_API_TOKEN) {
      throw new Error('WhatsApp API credentials are not configured on server.');
    }

    // Clean phone number: replace leading 0 with 62
    let recipientPhone = to.replace(/[^0-9]/g, '');
    if (recipientPhone.startsWith('0')) {
      recipientPhone = '62' + recipientPhone.substring(1);
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };

    const response = await axios.post(env.WA_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${env.WA_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    return {
      success: true,
      messageId: response.data?.messages?.[0]?.id || `wa_${Date.now()}`,
      provider: this.name,
      response: JSON.stringify(response.data),
      isMock: false,
    };
  }
}

module.exports = HttpWhatsAppProvider;

