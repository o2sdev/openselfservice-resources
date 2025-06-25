'use strict';

/**
 * create-account-page service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService(
    'api::create-account-page.create-account-page'
);
