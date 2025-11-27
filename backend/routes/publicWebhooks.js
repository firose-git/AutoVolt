const express = require('express');
const router = express.Router();
const WebhookService = require('../services/webhookService');

// Webhook endpoint handler (no authentication required)
router.post('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;

    // Prepare request data for processing
    const requestData = {
      headers: req.headers,
      body: req.body,
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress
    };

    console.log(`Received webhook ${webhookId} from ${requestData.ip}`);

    // Process the webhook
    const result = await WebhookService.processWebhook(webhookId, requestData);

    if (result.success) {
      console.log(`Webhook ${webhookId} processed successfully`);
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        noticeCreated: result.noticeCreated,
        noticeId: result.noticeId
      });
    } else {
      console.error(`Webhook ${webhookId} processing failed`);
      res.status(400).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Return appropriate error response
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: 'Webhook endpoint not found'
      });
    } else if (error.message.includes('signature')) {
      res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    } else if (error.message.includes('validation')) {
      res.status(400).json({
        success: false,
        message: 'Webhook data validation failed'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error processing webhook'
      });
    }
  }
});

// Health check for webhook endpoints
router.get('/:webhookId/health', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const feedId = WebhookService.activeWebhooks.get(webhookId);

    if (!feedId) {
      return res.status(404).json({
        success: false,
        message: 'Webhook endpoint not found'
      });
    }

    res.json({
      success: true,
      message: 'Webhook endpoint is active',
      webhookId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed'
    });
  }
});

module.exports = router;