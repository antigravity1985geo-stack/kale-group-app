import { test, expect } from '@playwright/test';

test.describe('BOG Webhook Verification', () => {
  test('should reject callback missing signature', async ({ request }) => {
    const response = await request.post('/api/pay/bog/callback', {
      data: {
        order_id: 'test-order-123',
        status: 'success'
      }
    });
    
    // The payment service should reject it and the route will likely return a 500 or just ignore the invalid signature
    // The exact response depends on how the route handles the false return from verifyBogCallback.
    // In our implementation, if verifyBogCallback fails, it throws or returns an error. Let's just expect it not to be ok (e.g., 500 or 400).
    expect(response.ok()).toBeFalsy();
  });

  test('should reject callback with invalid signature', async ({ request }) => {
    const response = await request.post('/api/pay/bog/callback', {
      headers: {
        'callback-signature': 'invalid-signature-data'
      },
      data: {
        order_id: 'test-order-123',
        status: 'success'
      }
    });
    
    expect(response.ok()).toBeFalsy();
  });
});
