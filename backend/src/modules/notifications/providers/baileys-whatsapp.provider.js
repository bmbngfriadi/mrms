const whatsappGateway = require('../../whatsapp/whatsapp-gateway.service');
const axios = require('axios');
const env = require('../../../config/env');

class BaileysWhatsAppProvider {
  constructor() {
    this.name = 'BAILEYS_WHATSAPP';
  }

  async sendMessage({ to, message }) {
    // 1. If running in the same process and connected, send directly through socket
    if (whatsappGateway.getStatus().isConnected) {
      return whatsappGateway.sendMessage(to, message);
    }

    // 2. If running in separate container (e.g. notification-worker), call backend internal endpoint
    const internalUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:5000/meeting-room/api';
    try {
      const response = await axios.post(
        `${internalUrl}/whatsapp/internal-send`,
        { to, message },
        {
          headers: {
            'x-internal-secret': process.env.JWT_SECRET || env.JWT_SECRET,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );
      return response.data?.data || response.data;
    } catch (err) {
      console.warn(
        '[BaileysWhatsAppProvider] Internal dispatch call error, falling back to local gateway:',
        err.response?.data?.message || err.message
      );
      // Fallback to local gateway (which produces safe mock/pending status if offline)
      return whatsappGateway.sendMessage(to, message);
    }
  }

  // Alias send({ recipient, body }) for backward compatibility
  async send({ recipient, body }) {
    return this.sendMessage({ to: recipient, message: body });
  }
}

module.exports = BaileysWhatsAppProvider;
