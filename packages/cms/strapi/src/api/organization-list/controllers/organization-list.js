'use strict';

/**
 * organization-list controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController(
    'api::organization-list.organization-list'
);
