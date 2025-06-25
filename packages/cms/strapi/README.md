# Strapi CMS Setup Instructions

This guide will help you set up and run the Strapi CMS from the provided export file.

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Git

## Setup Instructions

### 1. Copy Files to Appropriate Directories

First, ensure all files from the export are properly placed in their respective directories. The export file `example_20250623133223.tar.gz` should be in the root of the Strapi project.

### 2. Update package.json

Add the following plugins to the `dependencies` section in `package.json`:

```json
{
  "dependencies": {
    "@strapi/plugin-graphql": "5.16.0",
    "strapi-plugin-multi-select": "^2.1.1"
  }
}
```

### 3. Install Dependencies

Run the following command to install all project dependencies:

```bash
npm install
```

### 4. Import Data from Export

Import the data from the export file using the following command:

```bash
npm run strapi import -- -f example_20250623133223.tar.gz
```

### 5. Start Development Server

Once the import is complete, start the development server:

```bash
npm run develop
```

The Strapi admin panel should now be accessible at `http://localhost:1337/admin`.


For more detailed information, refer to the [Strapi documentation](https://docs.strapi.io/). 