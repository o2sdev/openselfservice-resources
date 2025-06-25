'use strict';

/**
 * configurable-texts service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService(
    'api::configurable-texts.configurable-texts'
);
