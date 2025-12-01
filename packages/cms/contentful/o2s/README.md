# Contentful <-> Open Self Service integration resources

In order to run the integration between Contentful and Open Self Service, a few resources may be required:

* Content model
* Sample content (not required but we're making it available so that you could get an idea of how the content models could be used to power O2S's frontend app)

This repository includes both assets (content types and content entries) in the `import.json` file.

Follow the instructions below to set up Contentful for the integration.

## Contentful CMS Setup Instructions

This guide will help you set up and import content types and content into Contentful from the provided JSON file.

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager
- Contentful CLI installed globally (`npm install -g contentful-cli`)
- A Contentful account and space

### Setup Instructions

#### 1. Install Contentful CLI

If you haven't already installed the Contentful CLI, run:

```bash
npm install -g contentful-cli
```

#### 2. Authenticate with Contentful

Log in to your Contentful account through the CLI:

```bash
contentful login
```

Follow the prompts to complete the authentication process.

#### 3. Import Content Types and Content

The `import.json` file located at `import.json` contains both content types and content entries. To import everything at once, use the following command:

```bash
contentful space import --space-id YOUR_SPACE_ID --content-file import.json
```

Replace `YOUR_SPACE_ID` with your actual Contentful space ID.

#### 4. Verify the Import

After the import is complete, log in to your Contentful web interface to verify that all content types and entries have been successfully imported.

```
https://app.contentful.com/spaces/YOUR_SPACE_ID
```

#### 5. Configure API Access

To use the imported content with Open Self Service, you'll need to configure API access:

1. Go to Settings > API Keys in your Contentful space
2. Create a new API key or use an existing one
3. Note the Space ID and Content Delivery API access token for use in your O2S configuration

For more detailed information about importing content to Contentful, refer to the [Contentful Import/Export documentation](https://www.contentful.com/developers/docs/tutorials/cli/import-and-export/).

For information about content modeling in Contentful, see the [Content Modeling Guide](https://www.contentful.com/developers/docs/concepts/data-model/).

For general Contentful documentation, visit the [Contentful Developer Center](https://www.contentful.com/developers/docs/).
