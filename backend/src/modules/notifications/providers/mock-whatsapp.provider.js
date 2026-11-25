class MockWhatsAppProvider {
  constructor() {
    this.name = 'MockWhatsAppProvider';
  }

  async sendMessage({ to, message }) {
    console.log(`[MOCK WHATSAPP] To: ${to}\n${message}\n--------------------`);
    return {
      success: true,
      messageId: `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: this.name,
      response: 'Simulated 200 OK wamid:HBgLM... (Mock Mode)',
      isMock: true,
    };
  }
}

module.exports = MockWhatsAppProvider;

