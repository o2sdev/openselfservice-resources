# Strapi <-> Open Self Service integration resources

In order to run the integration between Strapi and Open Self Service, a few resources may be required:

* Content model 
* Sample content (not required but we're making it available so that you could get an idea of how the content models could be used po power O2S's frontend app)

This repository includes both assets (exported samle content in `export_*.tar.gz` file and content models in the `src` folder).

Follow the instructions below to set up Strapi for the integration.

## Strapi CMS Setup Instructions

This guide will help you set up and run the Strapi CMS from the provided export file.

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Git
- TypeScript-based Strapi project in version 5.6 or later

### Setup Instructions

#### 1. Copy Files to Appropriate Directories

First, ensure all files from the export are properly placed in their respective directories. The export file `example_20250623133223.tar.gz` should be in the root of the Strapi project.

#### 2. Update package.json

Add the following plugins to the `dependencies` section in `package.json`:

```json
{
  "dependencies": {
    "@strapi/plugin-graphql": "5.16.0",
    "strapi-plugin-multi-select": "^2.1.1"
  }
}
```

These are used by the integration and O2S's content models and thus required.

#### 3. Install Dependencies

Run the following command to install all project dependencies:

```bash
npm install
```

#### 4. Import Data from Export

Import the data from the export file using the following command:

```bash
npm run strapi import -- -f example_20250623133223.tar.gz
```

#### 5. Start Development Server

Once the import is complete, start the development server:

```bash
npm run develop
```

The Strapi admin panel should now be accessible at `http://localhost:1337/admin`.


For more detailed information, refer to the [Strapi documentation](https://docs.strapi.io/). 
