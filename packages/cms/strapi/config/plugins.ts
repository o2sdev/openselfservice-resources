export default ({ env }) => ({
    'strapi-algolia': {
        enabled: true,
        config: {
            apiKey: env('ALGOLIA_ADMIN_KEY'),
            applicationId: env('ALGOLIA_APP_ID'),
            contentTypes: [
                {
                    name: 'api::article.article',
                    populate: {
                        SEO: {
                            fields: ['title', 'description'],
                            populate: {
                                keywords: {
                                    fields: ['keyword'],
                                },
                            },
                        },
                        content: {
                            populate: {
                                sections: {
                                    fields: ['*'],
                                },
                                category: {
                                    fields: ['name', 'description', 'slug'],
                                },
                                author: {
                                    fields: ['name', 'position'],
                                },
                            },
                        },
                    },
                },
            ],
        },
    },
});
