'use strict';
const { fetchBrowserListings } = require('./browserCollector');

async function fetchBunjangListings(query, options = {}) {
  return fetchBrowserListings('bunjang', query, options);
}

module.exports = { fetchBunjangListings };
