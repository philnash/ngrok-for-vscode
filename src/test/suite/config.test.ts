import * as assert from 'assert';
import {
  getConfigPath,
  getConfig,
  DEFAULT_CONFIG_PATH,
} from '../../ngrok/config';
import { suite, test, afterEach } from 'mocha';
import { join } from 'path';
import { stripIndent } from 'common-tags';
import { promises } from 'fs';
const { mkdir, writeFile } = promises;
import { promisify } from 'util';
import * as rimrafCallbacks from 'rimraf';
const rimraf = promisify(rimrafCallbacks);

suite('config', () => {
  suite('getConfigPath', () => {
    test('returns the default path if nothing is set in the settings', () => {
      assert.equal(DEFAULT_CONFIG_PATH, getConfigPath());
    });

    test('returns the path from the settings', async () => {
      // const config = workspace.getConfiguration('ngrokForVSCode');
      // somehow set the config...
      // assert.equal('~/blah', getConfigPath());
    });
  });

  suite('getConfig', () => {
    afterEach(async () => {
      await rimraf('fixtures');
    });

    test('parses a yaml fixture into config', async () => {
      await mkdir('fixtures');
      const fixtureConfigPath = join('.', 'fixtures', 'ngrok.yml');
      const configContent = stripIndent`
        authtoken: fakeauthtoken
        tunnels:
          test:
            addr: 3000
      `;
      await writeFile(fixtureConfigPath, configContent);

      const config = await getConfig(fixtureConfigPath);
      assert(
        typeof config !== 'undefined',
        `No config file at ${fixtureConfigPath}`
      );
      if (config) {
        assert.equal('fakeauthtoken', config.authtoken);
        if (config.tunnels) {
          console.log(config.tunnels);
          assert.equal(1, Object.keys(config.tunnels).length);
        }
      }
    });

    test('returns undefined if config not found at path', async () => {
      const config = await getConfig('ngrok-nope.yml');
      assert.ifError(config);
    });
  });
});
