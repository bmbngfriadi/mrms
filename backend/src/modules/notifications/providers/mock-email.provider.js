class MockEmailProvider {
  constructor() {
    this.name = 'MockEmailProvider';
  }

  async sendEmail({ to, subject, html, text }) {
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
    // Simulate successful queue / delivery in mock mode
    return {
      success: true,
      messageId: `mock_email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      provider: this.name,
      response: 'Simulated 250 OK Message accepted for delivery (Mock Mode)',
      isMock: true,
    };
  }
}

module.exports = MockEmailProvider;

