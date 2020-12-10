// The following script generates a 96-byte locally-managed master key and saves it to a file called master-key.txt in the directory from which the script is executed.

const fs = require('fs');
const crypto = require('crypto');
try {
  fs.writeFileSync('master-key.txt', crypto.randomBytes(96));
} catch (err) {
  console.error(err);
}