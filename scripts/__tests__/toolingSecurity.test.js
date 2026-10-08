const { checkBraces, checkRsa, checkSprintf } = require('../check-tooling-security.cjs');

test('brace parsers and AST operations reject excessive recursion and preserve normal globs', checkBraces);
test('RSA signatures reject extra DigestAlgorithm elements and accept valid signatures', checkRsa);
test('sprintf rejects excessive precision before native formatting and preserves supported formats', checkSprintf);
