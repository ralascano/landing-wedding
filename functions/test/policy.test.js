import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requireStaff,
  requireSuperadmin,
  requireOwner,
  requireTransition,
  requireUpload,
  publicEvent,
} from '../lib/policy.js';
import { validateConfig } from '../lib/config.js';
import { imageType, id } from '../lib/validation.js';
import { readFileSync } from 'node:fs';
const config = JSON.parse(
  readFileSync(new URL('../../src/config/event-config.json', import.meta.url), 'utf8'),
);
const seller = { uid: 'seller-1', role: 'seller', enabled: true, provider: 'password' };
const event = {
  id: 'event-1',
  ownerUid: seller.uid,
  status: 'active',
  privacyRevision: 3,
  legalDocumentIds: ['v1'],
  config,
  customerId: 'private',
  slug: 'test',
};
test('anonymous and unassigned accounts have no administrative access', () => {
  for (const actor of [
    null,
    {},
    { ...seller, provider: 'anonymous' },
    { ...seller, role: 'customer' },
    { ...seller, enabled: false },
  ])
    assert.throws(() => requireStaff(actor));
});
test('seller cannot assign roles or access another seller event', () => {
  assert.throws(() => requireSuperadmin(seller));
  assert.throws(() => requireOwner({ ...seller, uid: 'other' }, event));
  assert.doesNotThrow(() => requireOwner(seller, event));
  assert.doesNotThrow(() => requireOwner({ ...seller, role: 'superadmin', uid: 'other' }, event));
});
test('state transitions are explicit; finished is terminal', () => {
  for (const [a, b] of [
    ['draft', 'active'],
    ['active', 'closed'],
    ['closed', 'active'],
    ['closed', 'finished'],
  ])
    requireTransition(a, b);
  for (const [a, b] of [
    ['draft', 'finished'],
    ['active', 'draft'],
    ['finished', 'active'],
    ['active', 'active'],
  ])
    assert.throws(() => requireTransition(a, b));
});
test('upload requires current explicit consent and active event', () => {
  requireUpload(event, { accepted: true, revision: 3 });
  for (const access of [null, { accepted: false, revision: 3 }, { accepted: true, revision: 2 }])
    assert.throws(() => requireUpload(event, access));
  for (const status of ['draft', 'closed', 'finished'])
    assert.throws(() => requireUpload({ ...event, status }, { accepted: true, revision: 3 }));
});
test('public DTO does not expose internal customer or owner data', () => {
  const result = publicEvent(event);
  assert.equal(result.customerId, undefined);
  assert.equal(result.ownerUid, undefined);
});
test('config is serializable and event ID comes from backend', () => {
  const result = validateConfig(config, 'server-id', 'basic');
  assert.equal(result.event.id, 'server-id');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});
test('premium templates require event-specific registration', () => {
  const c = { ...config, template: 'premium:exclusive' };
  assert.throws(() => validateConfig(c, 'a', 'basic', { a: c.template }));
  assert.throws(() => validateConfig(c, 'b', 'premium', { a: c.template }));
  assert.equal(validateConfig(c, 'a', 'premium', { a: c.template }).template, c.template);
});
test('configuration rejects executable CSS, unsafe URLs and excessive batch sizes', () => {
  const bad = structuredClone(config);
  bad.theme.variables['--event-text'] = 'url(https://bad.example)';
  assert.throws(() => validateConfig(bad, 'a', 'basic'));
  const bad2 = structuredClone(config);
  bad2.images.backgroundDesktop = 'javascript:alert(1)';
  assert.throws(() => validateConfig(bad2, 'a', 'basic'));
  const bad3 = structuredClone(config);
  bad3.upload.maxFiles = 100;
  assert.throws(() => validateConfig(bad3, 'a', 'basic'));
});
test('storage identifiers cannot escape event paths', () => {
  for (const v of ['../x', 'a/b', '', null]) assert.throws(() => id(v));
});
test('media accepts only supported binary signatures; HTML/SVG rejected', () => {
  assert.equal(imageType(Buffer.from('<svg><script/>')), null);
  assert.equal(imageType(Buffer.from([255, 216, 255, 224])), 'image/jpeg');
});
