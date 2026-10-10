import currentBackground from '../assets/backgroundOscarVerito.jpg';
import currentMobileBackground from '../assets/backgroundOscarVeritoMobile.png';

// Vite imports stay at the local boundary. Remote data can use HTTPS URLs directly.
const localAssets = {
  'asset:current-background': currentBackground,
  'asset:current-background-mobile': currentMobileBackground,
};

function resolveAsset(value) {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('Expected an asset string or null.');
  if (!value.startsWith('asset:')) return value;
  if (!Object.hasOwn(localAssets, value)) throw new Error(`Unknown local asset: ${value}`);
  return localAssets[value];
}

export function resolveEventAssets(config) {
  return {
    ...config,
    // Compatibility with the saved V0 config, without modifying its original JSON.
    template: config.template ?? 'photo-hero',
    templateOptions: {
      identityPosition: 'top-center',
      formPosition: 'bottom-center',
      ...config.templateOptions,
    },
    metadata: { ...config.metadata, favicon: resolveAsset(config.metadata.favicon) },
    images: {
      ...config.images,
      backgroundDesktop: resolveAsset(
        config.images.backgroundDesktop ?? config.images.background?.desktop,
      ),
      backgroundMobile: resolveAsset(
        config.images.backgroundMobile !== undefined
          ? config.images.backgroundMobile
          : (config.images.background?.mobile ?? null),
      ),
    },
    qr: { ...config.qr, imageSrc: resolveAsset(config.qr.imageSrc) },
  };
}
