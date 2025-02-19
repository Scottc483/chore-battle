import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  switch (request.method) {
    case 'GET':
      return response.status(200).json({
        message: 'Test GET endpoint working!',
        query: request.query,
        timestamp: new Date().toISOString()
      });

    case 'POST':
      return response.status(200).json({
        message: 'Test POST endpoint working!',
        body: request.body,
        timestamp: new Date().toISOString()
      });

    default:
      return response.status(405).json({ 
        error: `Method ${request.method} not allowed` 
      });
  }
}