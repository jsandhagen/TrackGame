import { defineConfig } from 'vite';
import {nativeCompatibility,buildId,bundleVersion} from './scripts/build-identity.mjs';
export default defineConfig({ base: './', define:{__NATIVE_COMPAT__:JSON.stringify(nativeCompatibility),__BUILD_ID__:JSON.stringify(buildId),__GAME_VERSION__:JSON.stringify(bundleVersion)},build: { target: 'es2022' } });
