import {
  splitDualCampids,
  parseTrackingId,
} from '../src/modules/markets/tracking-id.util.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const a = splitDualCampids({
  tracking_campid: 'BF-OBF-11',
  campid: 'VENDOR-CAMP-99',
});
assert(a.trackingCampid === 'BF-OBF-11', 'tracking');
assert(a.vendorCampid === 'VENDOR-CAMP-99', 'vendor');
assert(a.resolveCampid === 'BF-OBF-11', 'resolve');

const legacy = splitDualCampids({ campid: 'BF-OBF-11' });
assert(legacy.trackingCampid === 'BF-OBF-11', 'legacy tracking');
assert(legacy.vendorCampid === '', 'legacy vendor empty');
assert(parseTrackingId(legacy.trackingCampid)?.campaignId === 11, 'parse');

const vendorOnly = splitDualCampids({ campid: 'ext-offer-xyz' });
assert(vendorOnly.trackingCampid === '', 'vendor-only tracking empty');
assert(vendorOnly.vendorCampid === 'ext-offer-xyz', 'vendor-only campid');

console.log('splitDualCampids OK');
