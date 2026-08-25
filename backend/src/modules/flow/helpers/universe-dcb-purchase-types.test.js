import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergePurchaseTypeMappings,
  resolvePurchaseTypeId,
  toVendorPurchaseTypes,
} from './universe-dcb-purchase-types.js';

const mappings = [
  { packKey: 'daily', label: 'Daily', purchaseTypeId: '2' },
  { packKey: 'weekly', label: 'Weekly', purchaseTypeId: '3' },
];

describe('mergePurchaseTypeMappings', () => {
  it('keeps campaign packs that exist on the provider catalog', () => {
    const merged = mergePurchaseTypeMappings(mappings, [
      { id: 2, code: 'RenewalDaily' },
      { id: 3, code: 'RenewalWeekly' },
      { id: 4, code: 'RenewalMonthly' },
    ]);
    assert.deepEqual(toVendorPurchaseTypes(merged), [
      {
        packKey: 'daily',
        label: 'Daily',
        purchaseTypeId: '2',
        code: 'RenewalDaily',
      },
      {
        packKey: 'weekly',
        label: 'Weekly',
        purchaseTypeId: '3',
        code: 'RenewalWeekly',
      },
    ]);
  });

  it('drops campaign mappings the provider no longer lists', () => {
    const merged = mergePurchaseTypeMappings(mappings, [
      { id: 3, code: 'RenewalWeekly' },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].purchaseTypeId, '3');
  });
});

describe('resolvePurchaseTypeId', () => {
  const config = { purchaseTypeMappings: mappings };

  it('accepts a mapped purchaseTypeId', () => {
    assert.equal(
      resolvePurchaseTypeId(config, { purchaseTypeId: 3 }),
      '3',
    );
  });

  it('maps pack key to purchaseTypeId', () => {
    assert.equal(resolvePurchaseTypeId(config, { pack: 'Weekly' }), '3');
  });

  it('prefers purchaseTypeId when both pack and id are sent', () => {
    assert.equal(
      resolvePurchaseTypeId(config, { pack: 'daily', purchaseTypeId: '3' }),
      '3',
    );
  });

  it('rejects an unmapped purchaseTypeId', () => {
    assert.throws(
      () => resolvePurchaseTypeId(config, { purchaseTypeId: '99' }),
      (err) => err.code === 'PURCHASE_TYPE_NOT_MAPPED',
    );
  });

  it('rejects an unknown pack key', () => {
    assert.throws(
      () => resolvePurchaseTypeId(config, { pack: 'yearly' }),
      (err) => err.code === 'PACK_UNKNOWN',
    );
  });
});
