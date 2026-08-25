export function mergePurchaseTypeMappings(
  configuredMappings = [],
  providerPurchaseTypes = [],
) {
  const providerById = new Map(
    (Array.isArray(providerPurchaseTypes) ? providerPurchaseTypes : []).map(
      (item) => [String(item?.id ?? item?.purchaseTypeId ?? ''), item],
    ),
  );
  return (Array.isArray(configuredMappings) ? configuredMappings : [])
    .filter((mapping) =>
      providerById.has(String(mapping?.purchaseTypeId ?? '')),
    )
    .map((mapping) => ({
      ...mapping,
      packKey: String(mapping.packKey || '').trim(),
      label: String(mapping.label || mapping.packKey || '').trim(),
      purchaseTypeId: String(mapping.purchaseTypeId),
      code: providerById.get(String(mapping.purchaseTypeId))?.code ?? null,
    }));
}

export function toVendorPurchaseTypes(mappings = []) {
  return (Array.isArray(mappings) ? mappings : [])
    .filter((item) => String(item?.purchaseTypeId || '').trim())
    .map((item) => ({
      packKey: String(item.packKey || '').trim(),
      label: String(item.label || item.packKey || '').trim(),
      purchaseTypeId: String(item.purchaseTypeId),
      code: item.code || null,
    }));
}

export function resolvePurchaseTypeId(config, input = {}) {
  const mappings = Array.isArray(config?.purchaseTypeMappings)
    ? config.purchaseTypeMappings
    : [];
  const idRaw = String(input.purchaseTypeId || '').trim();
  const packRaw = String(input.pack || input.packKey || '')
    .trim()
    .toLowerCase();

  if (idRaw) {
    if (mappings.length) {
      const match = mappings.find(
        (item) => String(item?.purchaseTypeId ?? '') === idRaw,
      );
      if (!match) {
        const err = new Error(
          'purchaseTypeId is not mapped for this campaign. GET /config for allowed packs.',
        );
        err.statusCode = 400;
        err.code = 'PURCHASE_TYPE_NOT_MAPPED';
        throw err;
      }
    }
    return idRaw;
  }

  if (packRaw) {
    const match = mappings.find(
      (item) => String(item?.packKey || '').trim().toLowerCase() === packRaw,
    );
    if (!match?.purchaseTypeId) {
      const err = new Error(
        'Unknown pack. GET /config for allowed purchase types.',
      );
      err.statusCode = 400;
      err.code = 'PACK_UNKNOWN';
      throw err;
    }
    return String(match.purchaseTypeId);
  }

  return '';
}
