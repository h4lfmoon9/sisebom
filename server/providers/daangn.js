'use strict';
const { fetchBrowserListings } = require('./browserCollector');

async function fetchDaangnListings(query, options = {}) {
  return fetchBrowserListings('daangn', query, options);
}

module.exports = { fetchDaangnListings };
