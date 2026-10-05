'use strict';
const { fetchIndexedListings } = require('./tavilyIndex');

async function fetchDaangnListings(query, options = {}) {
  return fetchIndexedListings('daangn', query, options);
}

module.exports = { fetchDaangnListings };
