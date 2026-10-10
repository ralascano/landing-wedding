// Explicit opt-in for the historical deployment; never redirects it to SaaS storage.
export async function uploadLegacyPhotos(files, name, technicalConfig) {
  if (import.meta.env.VITE_ENABLE_LEGACY_UPLOADS !== 'true') {
    throw new Error('La demo local no guarda fotos. Abre un evento /e/:slug para subirlas.');
  }
  const [{ storage }, { ref, uploadBytes }] = await Promise.all([
    import('../firebase.js'),
    import('firebase/storage'),
  ]);
  for (const { file } of files) {
    await uploadBytes(
      ref(storage, `${technicalConfig.storagePrefix}/${name}/${Date.now()}-${file.name}`),
      file,
    );
  }
}
