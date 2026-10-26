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

function uniquePurchaseTypes(mappings = []) {
  const seen = new Set();
  const usable = [];
  for (const item of Array.isArray(mappings) ? mappings : []) {
    const purchaseTypeId = String(item?.purchaseTypeId ?? '').trim();
    if (!purchaseTypeId || seen.has(purchaseTypeId)) continue;
    seen.add(purchaseTypeId);
    usable.push({
      ...item,
      packKey: String(item.packKey || item.pack || '').trim(),
      label: String(item.label || item.packKey || item.pack || '').trim(),
      purchaseTypeId,
    });
  }
  return usable;
}

/** Campaign mappings, or the provider intersection when a catalog array is passed. */
export function usablePurchaseTypes(configured = [], providerPurchaseTypes) {
  if (Array.isArray(providerPurchaseTypes)) {
    return uniquePurchaseTypes(
      mergePurchaseTypeMappings(configured, providerPurchaseTypes),
    );
  }
  return uniquePurchaseTypes(configured);
}

/**
 * skipSinglePackPage is opt-in.
 * pin: exactly one usable pack — send PIN, do not open the pack page.
 * none: flag is on and no usable pack remains.
 * show: keep the pack page.
 */
export function resolveSinglePackPlan(config, providerPurchaseTypes) {
  if (config?.skipSinglePackPage !== true) return { action: 'show' };
  const packs = usablePurchaseTypes(
    config?.purchaseTypeMappings,
    providerPurchaseTypes,
  );
  if (packs.length === 1) return { action: 'pin', pack: packs[0] };
  if (packs.length === 0) return { action: 'none' };
  return { action: 'show' };
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
