'use strict';

/**
 * create-new-password-page service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService(
    'api::create-new-password-page.create-new-password-page'
);
