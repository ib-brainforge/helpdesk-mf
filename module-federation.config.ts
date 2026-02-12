import { createModuleFederationConfig } from '@module-federation/modern-js';

const mfPackagesUrl = process.env.MF_PACKAGES_URL || 'http://localhost';
const mfNavbarUrl = process.env.MF_NAVBAR_URL || `${mfPackagesUrl}:3001`;

export default createModuleFederationConfig({
  name: 'helpdesk_mf',
  remotes: {
    '@brainforgeau/navbar': `navbar@${mfNavbarUrl}/remoteEntry.js`
  },
  shared: {
    react: {
      singleton: true,
      requiredVersion: '18.3.1',
      strictVersion: true,
      eager: true,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '18.3.1',
      strictVersion: true,
      eager: true,
    },
    // Components is not shared because it requires webpack SVG transformations
    // The navbar remote will bundle its own copy of components
    // '@brainforgeau/components': {
    //   singleton: true,
    //   requiredVersion: false,
    // },
    // Security MUST be shared as singleton for auth context to work across module federation
    '@brainforgeau/security': {
      singleton: true,
      requiredVersion: false,
      eager: true, // Load eagerly since auth is needed immediately
    },
    'jotai': {
      singleton: true,
      requiredVersion: false,
    },
    '@heroui/react': {
      singleton: true,
      requiredVersion: false,
    },
    '@heroicons/react': {
      singleton: true,
      requiredVersion: false,
    },
    'framer-motion': {
      singleton: true,
      requiredVersion: false,
    }
  },
  dts: {
    consumeTypes: {
      typesFolder: '@mf-types',
      consumeAPITypes: true,
      abortOnError: false,
      maxRetries: 3,
      deleteTypesFolder: true,
    },
  },
});
