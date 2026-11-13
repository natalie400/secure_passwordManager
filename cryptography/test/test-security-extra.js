"use strict";

// Extra tests for Stage 4. The official test file is left untouched.
// Run with: npm test   (mocha picks up every file in test/)

const expect = require('expect.js');
const { Keychain } = require('../password-manager');

async function rejects(promise) {
  try { await promise; } catch (e) { return true; }
  return false;
}

function flipByte(b64) {
  const buf = Buffer.from(b64, 'base64');
  buf[0] ^= 0x01;
  return buf.toString('base64');
}

describe('Extra security tests', function () {
  this.timeout(20000);
  const pw = 'master-password-!';

  describe('basic behaviour', function () {
    it('1-3. init, set and get a password', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('example.com', 'secret1');
      expect(await kc.get('example.com')).to.equal('secret1');
    });

    it('4. updates an existing password', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('example.com', 'old');
      await kc.set('example.com', 'new');
      expect(await kc.get('example.com')).to.equal('new');
      const [repr] = await kc.dump();
      expect(Object.keys(JSON.parse(repr).kvs).length).to.equal(1);
    });

    it('5-6. deletes a password and returns null for missing domains', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('a.com', 'x');
      expect(await kc.remove('a.com')).to.be(true);
      expect(await kc.remove('a.com')).to.be(false);
      expect(await kc.get('a.com')).to.be(null);
      expect(await kc.get('never-added.com')).to.be(null);
    });

    it('16. handles an empty database (dump and load)', async function () {
      const kc = await Keychain.init(pw);
      const [repr, sum] = await kc.dump();
      const kc2 = await Keychain.load(pw, repr, sum);
      expect(await kc2.get('anything')).to.be(null);
    });

    it('17. handles many records and a dump/load round trip', async function () {
      const kc = await Keychain.init(pw);
      for (let i = 0; i < 50; i++) await kc.set('site' + i + '.com', 'pw-' + i);
      const [repr, sum] = await kc.dump();
      const kc2 = await Keychain.load(pw, repr, sum);
      for (let i = 0; i < 50; i++) expect(await kc2.get('site' + i + '.com')).to.equal('pw-' + i);
    });

    it('18. handles passwords at and around the maximum length, including Unicode', async function () {
      const kc = await Keychain.init(pw);
      const max = 'a'.repeat(64);
      await kc.set('max.com', max);
      await kc.set('empty.com', '');
      await kc.set('uni.com', 'é✓'.repeat(32)); // 64 UTF-16 units, multi-byte UTF-8
      expect(await kc.get('max.com')).to.equal(max);
      expect(await kc.get('empty.com')).to.equal('');
      expect(await kc.get('uni.com')).to.equal('é✓'.repeat(32));
      expect(await rejects(kc.set('toolong.com', 'a'.repeat(65)))).to.be(true);
    });
  });

  describe('serialization and master password', function () {
    it('7-8. dump and restore with the correct password', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('a.com', '1');
      const [repr, sum] = await kc.dump();
      const kc2 = await Keychain.load(pw, repr, sum);
      expect(await kc2.get('a.com')).to.equal('1');
    });

    it('9. rejects an incorrect master password', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('a.com', '1');
      const [repr, sum] = await kc.dump();
      expect(await rejects(Keychain.load('wrong-password', repr, sum))).to.be(true);
      expect(await rejects(Keychain.load('wrong-password', repr))).to.be(true); // no checksum either
    });

    it('load works without a checksum when the password is right', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('a.com', '1');
      const [repr] = await kc.dump();
      const kc2 = await Keychain.load(pw, repr);
      expect(await kc2.get('a.com')).to.equal('1');
    });
  });

  describe('attacks', function () {
    it('10. detects modified ciphertext (no checksum supplied)', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('a.com', 'secret');
      const [repr] = await kc.dump();
      const obj = JSON.parse(repr);
      const key = Object.keys(obj.kvs)[0];
      obj.kvs[key].ct = flipByte(obj.kvs[key].ct);
      const kc2 = await Keychain.load(pw, JSON.stringify(obj));
      expect(await rejects(kc2.get('a.com'))).to.be(true);
    });

    it('10b. detects a modified IV', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('a.com', 'secret');
      const [repr] = await kc.dump();
      const obj = JSON.parse(repr);
      const key = Object.keys(obj.kvs)[0];
      obj.kvs[key].iv = flipByte(obj.kvs[key].iv);
      const kc2 = await Keychain.load(pw, JSON.stringify(obj));
      expect(await rejects(kc2.get('a.com'))).to.be(true);
    });

    it('11. detects swapped records WITHOUT using the trusted checksum', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('google.com', 'google-pw');
      await kc.set('evil.com', 'evil-pw');
      const [repr] = await kc.dump();
      const obj = JSON.parse(repr);
      const [k1, k2] = Object.keys(obj.kvs);
      [obj.kvs[k1], obj.kvs[k2]] = [obj.kvs[k2], obj.kvs[k1]];
      const kc2 = await Keychain.load(pw, JSON.stringify(obj)); // no checksum passed
      expect(await rejects(kc2.get('google.com'))).to.be(true);
      expect(await rejects(kc2.get('evil.com'))).to.be(true);
    });

    it('12. detects rollback when the trusted checksum is provided', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('google.com', 'old-password');
      const [oldRepr] = await kc.dump();
      await kc.set('google.com', 'new-password');
      const [newRepr, newSum] = await kc.dump();
      expect(await rejects(Keychain.load(pw, oldRepr, newSum))).to.be(true);
      const ok = await Keychain.load(pw, newRepr, newSum);
      expect(await ok.get('google.com')).to.equal('new-password');
    });

    it('rollback without a checksum is NOT detected (documented limitation)', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('google.com', 'old-password');
      const [oldRepr] = await kc.dump();
      await kc.set('google.com', 'new-password');
      const old = await Keychain.load(pw, oldRepr); // no trusted checksum
      expect(await old.get('google.com')).to.equal('old-password');
    });
  });

  describe('information leakage', function () {
    it('13. password length is not revealed (equal ciphertext sizes)', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('a.com', 'x');
      await kc.set('b.com', 'y'.repeat(10));
      await kc.set('c.com', 'z'.repeat(64));
      const obj = JSON.parse((await kc.dump())[0]);
      const sizes = new Set(Object.values(obj.kvs).map(r => r.ct.length));
      expect(sizes.size).to.equal(1);
    });

    it('14. domain names are not stored in plaintext', async function () {
      const kc = await Keychain.init(pw);
      await kc.set('www.secret-bank.com', 'hunter2');
      const [repr] = await kc.dump();
      expect(repr).not.to.contain('secret-bank');
      expect(repr).not.to.contain('hunter2');
    });

    it('15. master password and keys are not serialized', async function () {
      const master = 'my-very-unique-master-pw';
      const kc = await Keychain.init(master);
      await kc.set('a.com', 'x');
      const [repr] = await kc.dump();
      expect(repr).not.to.contain(master);
      expect(Object.keys(JSON.parse(repr)).sort()).to.eql(['check', 'kvs', 'salt']);
    });

    it('salts differ between keychains with the same password', async function () {
      const a = JSON.parse((await (await Keychain.init(pw)).dump())[0]);
      const b = JSON.parse((await (await Keychain.init(pw)).dump())[0]);
      expect(a.salt).not.to.equal(b.salt);
    });
  });

  describe('IV handling', function () {
    it('19. every encryption uses a fresh IV and gives a different ciphertext', async function () {
      const kc = await Keychain.init(pw);
      const ivs = new Set();
      const cts = new Set();
      for (let i = 0; i < 100; i++) {
        await kc.set('same.com', 'same-password');
        const rec = Object.values(JSON.parse((await kc.dump())[0]).kvs)[0];
        ivs.add(rec.iv);
        cts.add(rec.ct);
      }
      expect(ivs.size).to.equal(100);
      expect(cts.size).to.equal(100);
    });
  });

  describe('performance shape', function () {
    async function time(fn, reps) {
      const t = process.hrtime.bigint();
      for (let i = 0; i < reps; i++) await fn();
      return Number(process.hrtime.bigint() - t) / 1e6;
    }

    it('20a. set/get/remove time does not grow with the number of records', async function () {
      const small = await Keychain.init(pw);
      const large = await Keychain.init(pw);
      for (let i = 0; i < 2000; i++) await large.set('d' + i, 'p');
      for (let i = 0; i < 10; i++) await small.set('d' + i, 'p');

      await time(() => small.get('d1'), 50); // warm-up
      const tSmall = await time(() => small.get('d1'), 300);
      const tLarge = await time(() => large.get('d1'), 300);
      expect(tLarge / tSmall).to.be.lessThan(4); // generous margin to avoid flakiness
    });

    it('20b. dump time grows roughly linearly with the number of records', async function () {
      const a = await Keychain.init(pw);
      const b = await Keychain.init(pw);
      for (let i = 0; i < 500; i++) await a.set('d' + i, 'p');
      for (let i = 0; i < 2000; i++) await b.set('d' + i, 'p');
      await time(() => a.dump(), 20); // warm-up
      const tA = await time(() => a.dump(), 100);
      const tB = await time(() => b.dump(), 100);
      expect(tB / tA).to.be.lessThan(4 * 3); // ~4x data, allow slack up to 3x linear
    });
  });
});