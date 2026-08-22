import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultStartConfig,
  normalizeStartConfig,
  stripMetaFlowNodes,
} from './start-config.js';

describe('start-config', () => {
  it('defaults HE checks on for HEADER_INJECTION / BOTH', () => {
    assert.deepEqual(defaultStartConfig('BOTH'), {
      runHe: true,
      runBlocklist: true,
      runChecksub: true,
    });
    assert.equal(defaultStartConfig('HEADER_INJECTION').runHe, true);
    assert.deepEqual(defaultStartConfig('UNIVERSE_DCB'), {
      runHe: true,
      runBlocklist: true,
      runChecksub: true,
    });
  });

  it('defaults HE off for OTP_ONLY', () => {
    assert.equal(defaultStartConfig('OTP_ONLY').runHe, false);
    assert.equal(defaultStartConfig('NONE').runHe, false);
    assert.equal(defaultStartConfig('CG_HOME').runHe, false);
  });

  it('normalize fills missing keys from mode defaults', () => {
    const n = normalizeStartConfig({ runHe: false }, 'BOTH');
    assert.equal(n.runHe, false);
    assert.equal(n.runBlocklist, true);
    assert.equal(n.runChecksub, true);
  });

  it('stripMetaFlowNodes drops START/END and keeps startConfig', () => {
    const cleaned = stripMetaFlowNodes({
      entryPage: 'HOME',
      startConfig: { runHe: true, runBlocklist: false, runChecksub: true },
      nodes: [
        { id: '__START__', pageType: 'START' },
        { id: 'HOME', pageType: 'HOME' },
        { id: '__END__', pageType: 'END' },
      ],
      edges: [
        { id: 'a', source: '__START__', target: 'HOME' },
        { id: 'b', source: 'HOME', target: '__END__' },
      ],
    });
    assert.equal(cleaned.nodes.length, 1);
    assert.equal(cleaned.nodes[0].pageType, 'HOME');
    assert.equal(cleaned.edges.length, 0);
    assert.equal(cleaned.startConfig.runBlocklist, false);
  });
});
