'use strict';
/**
 * Travel Service HTTP endpoint  ->  /.netlify/functions/travel
 *
 * The browser calls THIS; it never sees an API key and never calls the provider.
 * Actions: status | cheapestDates | search | priceAnalysis | saveTrip | listTrips
 *
 * GET  /.netlify/functions/travel?action=status
 * POST /.netlify/functions/travel   { "action":"cheapestDates", "query":{...} }
 */
const { handleAction } = require('./lib/travelService');
const store = require('./lib/store');

const CORS = {
  'Access-Control-Allow-Origin': process.env.SITE_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  try {
    const isPost = event.httpMethod === 'POST';
    const body = isPost && event.body ? safeJson(event.body) : {};
    const params = event.queryStringParameters || {};
    const action = (isPost ? body.action : params.action) || 'status';
    const query = isPost ? (body.query || {}) : params;

    // trip persistence for server-side monitoring (used by "Enable alerts")
    if (action === 'saveTrip') {
      if (!isPost) return json(405, { status: 'error', message: 'POST required' });
      const id = await store.saveTrip(body.trip || {});
      return json(200, { status: 'ok', id });
    }
    if (action === 'listTrips') {
      const trips = await store.listTrips();
      return json(200, { status: 'ok', data: trips });
    }
    if (action === 'history') {
      const id = (isPost ? body.tripId : params.tripId) || '';
      const data = await store.getHistory(id);
      return json(200, { status: 'ok', data });
    }

    const result = await handleAction(action, query, process.env);
    const code = result.status === 'ok' ? 200
      : result.status === 'not_configured' ? 200   // honest state, not an error
      : result.status === 'invalid' ? 400
      : result.status === 'error' ? 502 : 200;
    return json(code, result);
  } catch (e) {
    return json(500, { status: 'error', message: e.message || 'unexpected error' });
  }
};

function json(statusCode, obj) { return { statusCode, headers: CORS, body: JSON.stringify(obj) }; }
function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
