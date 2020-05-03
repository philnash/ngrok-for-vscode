import * as assert from 'assert';
import { getConfigPath, DEFAULT_CONFIG_PATH } from '../../ngrok/config';
import { workspace } from 'vscode';
import { suite, test } from 'mocha';

suite('config', () => {
  suite('getConfigPath', () => {
    test('returns the default path if nothing is set in the settings', () => {
      assert.equal(DEFAULT_CONFIG_PATH, getConfigPath());
    });

    test('returns the path from the settings', async () => {
      // const config = workspace.getConfiguration('ngrokForVSCode');
      // somehow set the config...
      assert.equal('~/blah', getConfigPath());
    });
  });

  // suite('getConfig', () => {});
});
