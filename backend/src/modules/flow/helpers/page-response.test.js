import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLiveProjectData } from './page-response.js';

describe('resolveLiveProjectData', () => {
  it('fills placeholders in mobile and desktop layout html without mutating source', () => {
    const source = {
      deviceLayouts: {
        desktop: { html: '<d>{{operator}}</d>', css: 'd{}' },
        mobile: { html: '<m>{{operator}}</m>', css: 'm{}' },
      },
    };
    const out = resolveLiveProjectData(source, { operator: 'safaricom' });
    assert.equal(out.deviceLayouts.mobile.html, '<m>safaricom</m>');
    assert.equal(out.deviceLayouts.desktop.html, '<d>safaricom</d>');
    assert.equal(source.deviceLayouts.mobile.html, '<m>{{operator}}</m>');
  });

  it('returns empty object when projectData is missing', () => {
    assert.deepEqual(resolveLiveProjectData(null, {}), {});
  });
});
