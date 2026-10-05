'use strict';
const { fetchIndexedListings } = require('./tavilyIndex');

async function fetchJoongnaListings(query, options = {}) {
  return fetchIndexedListings('joongna', query, options);
}

module.exports = { fetchJoongnaListings };
