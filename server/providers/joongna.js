'use strict';
const { fetchBrowserListings } = require('./browserCollector');

async function fetchJoongnaListings(query, options = {}) {
  return fetchBrowserListings('joongna', query, options);
}

module.exports = { fetchJoongnaListings };
