const whatsappGateway = require('./whatsapp-gateway.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { logAudit } = require('../../utils/audit');

class WhatsAppGatewayController {
  async getStatus(req, res, next) {
    try {
      const status = whatsappGateway.getStatus();
      return successResponse(res, status);
    } catch (err) {
      next(err);
    }
  }

  async connect(req, res, next) {
    try {
      const status = await whatsappGateway.connect();
      await logAudit({
        userId: req.user?.id,
        action: 'WHATSAPP_GATEWAY_CONNECT_REQUESTED',
        resourceType: 'SYSTEM',
        newValues: { status: status.status },
        req,
      });
      return successResponse(res, status, 'Inisialisasi koneksi WhatsApp Gateway dimulai.');
    } catch (err) {
      return errorResponse(res, `Gagal menghubungkan WhatsApp Gateway: ${err.message}`, 500);
    }
  }

  async disconnect(req, res, next) {
    try {
      const clearSession = req.body?.clearSession === true;
      const status = await whatsappGateway.disconnect(clearSession);
      await logAudit({
        userId: req.user?.id,
        action: 'WHATSAPP_GATEWAY_DISCONNECTED',
        resourceType: 'SYSTEM',
        newValues: { clearSession },
        req,
      });
      return successResponse(res, status, 'WhatsApp Gateway berhasil diputus.');
    } catch (err) {
      next(err);
    }
  }

  async testConnection(req, res, next) {
    try {
      const result = await whatsappGateway.testConnection();
      return successResponse(res, result, result.message);
    } catch (err) {
      return errorResponse(res, `Tes koneksi gagal: ${err.message}`, 500);
    }
  }

  async testSend(req, res, next) {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return errorResponse(res, 'Nomor tujuan dan pesan wajib diisi.', 400);
      }

      const result = await whatsappGateway.sendMessage(phone, message);
      await logAudit({
        userId: req.user?.id,
        action: 'WHATSAPP_TEST_MESSAGE_SENT',
        resourceType: 'NOTIFICATION',
        newValues: { phone, isMock: result.isMock },
        req,
      });

      return successResponse(
        res,
        result,
        result.isMock
          ? 'Pesan uji coba berhasil diproses (Mode Antrean / Mock aktif).'
          : 'Pesan uji coba WhatsApp berhasil dikirim langsung!'
      );
    } catch (err) {
      return errorResponse(res, err.message, 500);
    }
  }
}

module.exports = new WhatsAppGatewayController();

