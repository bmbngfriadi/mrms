const nodemailer = require('nodemailer');
const env = require('../../../config/env');

class SmtpEmailProvider {
  constructor() {
    this.name = 'SmtpEmailProvider';
    this.transporter = null;
    this.lastUser = null;
    this.lastPass = null;
  }

  getTransporter() {
    const user = process.env.SMTP_USER || env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS || env.SMTP_PASS;
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : '';
    const host = process.env.SMTP_HOST || env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === 'true' || env.SMTP_SECURE === true || port === 465;

    if (!user || !pass) {
      return null;
    }

    if (!this.transporter || this.lastUser !== user || this.lastPass !== pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.lastUser = user;
      this.lastPass = pass;
    }

    return this.transporter;
  }

  async verifyConnection() {
    const transporter = this.getTransporter();
    if (!transporter) {
      throw new Error('Kredensial SMTP belum dikonfigurasi di server.');
    }
    return await transporter.verify();
  }

  async sendEmail({ to, subject, html, text }) {
    const transporter = this.getTransporter();
    if (!transporter) {
      throw new Error('Kredensial SMTP belum dikonfigurasi di server.');
    }

    const from = process.env.SMTP_FROM || env.SMTP_FROM || 'MRMS System <batam.cg@gmail.com>';

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
      provider: this.name,
      response: info.response,
      isMock: false,
    };
  }
}

module.exports = SmtpEmailProvider;
