import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPostbackRegister } from './postback-register.js';
import {
  affiliateRcidFromLandingUrl,
  affiliateRcidFromVisit,
  applyVisitAttributionToPostback,
  fillTemplate,
} from './postback-template.js';

describe('fillTemplate', () => {
  it('fills {rcid} when vendor maps it onto click_id=', () => {
    const url = fillTemplate(
      'https://tickhigh.track-myads.com/postback?click_id={rcid}',
      { click_id: 'minted-ours', rcid: 'AFF-99' },
    );
    assert.equal(
      url,
      'https://tickhigh.track-myads.com/postback?click_id=AFF-99',
    );
  });

  it('fills URL-encoded {rcid} placeholders', () => {
    const url = fillTemplate(
      'https://vendor.example/pb?click_id=%7Brcid%7D',
      { rcid: 'AFF-1' },
    );
    assert.equal(url, 'https://vendor.example/pb?click_id=AFF-1');
  });
});

describe('affiliateRcidFromVisit', () => {
  it('prefers stored visit.rcid', () => {
    assert.equal(
      affiliateRcidFromVisit({
        rcid: 'AFF-store',
        landingUrl: 'https://wap.example/?click_id=from-url',
      }),
      'AFF-store',
    );
  });

  it('recovers affiliate click from landing URL when rcid is empty', () => {
    assert.equal(
      affiliateRcidFromLandingUrl(
        'https://wap.example/bf?click_id=TH-CLICK&campid=9',
      ),
      'TH-CLICK',
    );
    assert.equal(
      affiliateRcidFromVisit({
        rcid: '',
        landingUrl: 'https://wap.example/bf?click_id=TH-CLICK',
      }),
      'TH-CLICK',
    );
  });

  it('ignores unfilled {rcid} macros on the landing URL', () => {
    assert.equal(
      affiliateRcidFromVisit({
        rcid: '{rcid}',
        landingUrl: 'https://wap.example/?click_id={click_id}',
      }),
      '',
    );
  });
});

describe('registerPending vendor callback', () => {
  it('does not copy another vendor URL when this vendor has none', async () => {
    const saved = [];
    const chain = {
      where() {
        return this;
      },
      orderBy() {
        return this;
      },
      take() {
        return this;
      },
      getOne: async () => null,
    };
    const { registerPending } = createPostbackRegister({
      getPostbackRepo: () => ({
        createQueryBuilder: () => chain,
        create: (row) => row,
        save: async (row) => {
          const stored = { ...row, id: 5 };
          saved.push(stored);
          return stored;
        },
      }),
      getVendorRepo: () => ({
        findOne: async ({ where }) =>
          where.id === 9
            ? {
                id: 9,
                postbackUrl:
                  'https://tickhigh.track-myds.com/postback?click_id={rcid}',
              }
            : { id: 15, postbackUrl: '  ' },
      }),
      getTrackingRepo: () => ({
        find: async () => [{ vendorId: 9, active: true }],
      }),
      getVisitRepo: () => ({ findOne: async () => null }),
    });

    const out = await registerPending({
      vendorId: 15,
      campaignId: 3,
      msisdn: '962777263748',
      clickId: 'clk-15',
      asReceived: true,
    });

    assert.equal(out.id, 5);
    assert.equal(saved[0].vendorId, 15);
    assert.equal(saved[0].postbackUrl, null);
  });
});

describe('applyVisitAttributionToPostback', () => {
  it('copies visit rcid onto an empty postback row', () => {
    const row = { clickId: null, rcid: null };
    applyVisitAttributionToPostback(row, {
      clickId: 'minted-1',
      rcid: 'AFF-77',
      campid: 'v1',
    });
    assert.equal(row.rcid, 'AFF-77');
    assert.equal(row.clickId, 'minted-1');
    assert.equal(row.campid, 'v1');
  });
});
