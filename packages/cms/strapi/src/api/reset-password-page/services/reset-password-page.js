'use strict';

/**
 * reset-password-page service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService(
    'api::reset-password-page.reset-password-page'
);
