const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const braces = require('braces');
const forge = require('node-forge');
const { sprintf, vsprintf } = require('sprintf-js');

function checkBraces() {
  for (const delimiter of ['{', '(']) {
    const close = delimiter === '{' ? '}' : ')';
    assert.throws(() => braces.parse(delimiter.repeat(4000) + 'x' + close.repeat(4000)), {
      name: 'SyntaxError', message: 'Maximum nesting depth exceeded',
    });
  }
  for (const operation of [braces.compile, braces.expand, braces.stringify]) {
    let ast = { type: 'text', value: 'x' };
    for (let i = 0; i < 800; i++) ast = { type: 'root', nodes: [ast] };
    assert.throws(() => operation(ast), { name: 'SyntaxError', message: 'Maximum nesting depth exceeded' });
  }
  assert.deepEqual(braces.expand('src/{app,components}/*.{ts,tsx}'), [
    'src/app/*.ts', 'src/app/*.tsx', 'src/components/*.ts', 'src/components/*.tsx',
  ]);
  assert.equal(braces.stringify(braces.parse('src/{app,components}/*.ts')), 'src/{app,components}/*.ts');
}

function checkRsa() {
  // A disposable test key; no application credentials or stored user keys.
  const keys = generateKeyPairSync('rsa', { modulusLength: 1024, publicExponent: 3 });
  const privateKey = forge.pki.privateKeyFromPem(keys.privateKey.export({ type: 'pkcs1', format: 'pem' }));
  const publicKey = forge.pki.publicKeyFromPem(keys.publicKey.export({ type: 'pkcs1', format: 'pem' }));
  const md = forge.md.sha256.create();
  md.update('toolchain-security-regression', 'utf8');
  const digest = md.digest().getBytes();
  assert.equal(publicKey.verify(digest, privateKey.sign(md)), true);
  const { asn1 } = forge;
  const node = (type, constructed, value) => asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
  for (const withNull of [true, false]) {
    const algorithm = [node(asn1.Type.OID, false, asn1.oidToDer(forge.pki.oids.sha256).getBytes())];
    if (withNull) algorithm.push(node(asn1.Type.NULL, false, ''));
    const info = extra => node(asn1.Type.SEQUENCE, true, [
      node(asn1.Type.SEQUENCE, true, [...algorithm, ...extra]), node(asn1.Type.OCTETSTRING, false, digest),
    ]);
    const valid = privateKey.sign(asn1.toDer(info([])).getBytes(), 'NONE');
    assert.equal(publicKey.verify(digest, valid), true);
    const malformed = privateKey.sign(asn1.toDer(info([node(asn1.Type.NULL, false, '')])).getBytes(), 'NONE');
    // With no optional NULL, an extra NULL is itself valid. Add a third element.
    const attack = withNull ? malformed : privateKey.sign(asn1.toDer(info([
      node(asn1.Type.NULL, false, ''), node(asn1.Type.NULL, false, ''),
    ])).getBytes(), 'NONE');
    assert.throws(() => publicKey.verify(digest, attack), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
  }
}

function checkSprintf() {
  for (const format of ['%.101f', '%.101e', '%.101g', '%.0g', '%.999999999999999999999f', '%999999999999999999s']) {
    assert.throws(() => sprintf(format, 1.25), { name: 'SyntaxError' });
  }
  assert.equal(sprintf('%.0f', 1.25), '1');
  assert.equal(sprintf('%.0e', 1.25), '1e+0');
  assert.equal(sprintf('%.100f', 1).length, 102);
  assert.equal(sprintf('%.100e', 1).length, 105);
  assert.equal(sprintf('%.100g', 1.25), '1.25');
  assert.equal(sprintf('%2$s: %1$04d', 7, 'item'), 'item: 0007');
  assert.equal(sprintf('%(user.name)s', { user: { name: 'fixture' } }), 'fixture');
  assert.equal(vsprintf('%s %.2f', ['total', 12.345]), 'total 12.35');
}

module.exports = { checkBraces, checkRsa, checkSprintf };
if (require.main === module) {
  try {
    checkBraces(); checkRsa(); checkSprintf();
    console.log('Tooling security: nesting, RSA DigestInfo and numeric formatting verified.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
