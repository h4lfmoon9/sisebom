'use strict';
const { fetchIndexedListings } = require('./tavilyIndex');

async function fetchBunjangListings(query, options = {}) {
  return fetchIndexedListings('bunjang', query, options);
}

module.exports = { fetchBunjangListings };
