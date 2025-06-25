'use strict';

/**
 * create-account-page router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter(
    'api::create-account-page.create-account-page'
);
