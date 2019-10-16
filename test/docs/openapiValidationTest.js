const path = require('path');
const Enforcer = require('openapi-enforcer');
const expect = require('chai').expect;


function logEnforcerException(err, key, level) {
  key = key || 'root';
  level = level || 0;
  indent = ' '.repeat(level);
  if (err.hasException) {
    console.log(`${indent}> ${key}: ${err.header || err.message()}`);
    for (childKey in err.children.at) {
      logEnforcerException(err.children.at[childKey], childKey, level + 2);
    }
  }
}

describe.only('mage openapi document', function() {

  it('is valid', async function() {

    const openapiDocPath = path.resolve(__dirname, '..', '..', 'docs', 'openapi.yaml');
    const { error, warning } = await Enforcer(openapiDocPath, { fullResult: true });

    if (error) {
      // logEnforcerException(error);
      console.log(error.message());
      console.log(`\n${error.count} validation errors\n`);
    }

    if (warning) {
      console.log(warning);
      console.log(`\n${warning.count} validation warnings\n`);
    }

    expect(error).to.be.undefined;
    expect(warning).to.be.undefined;
  });
});