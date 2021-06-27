import { RenderingConfig } from '../config';
import { Logger } from '../logger';
import { Browser } from './browser';
import { ClusteredBrowser } from './clustered';
import { ReusableBrowser } from './reusable';
import { RemoteSeleniumBrowser } from './remote-selenium';

export function createBrowser(config: RenderingConfig, log: Logger): Browser {
  if (config.mode === 'clustered') {
    log.info('using clustered browser', 'mode', config.clustering.mode, 'maxConcurrency', config.clustering.maxConcurrency);
    return new ClusteredBrowser(config, log);
  }

  if (config.mode === 'reusable') {
    log.info('using reusable browser');
    return new ReusableBrowser(config, log);
  }

  if (config.mode === 'remote-selenium') {
    log.info('using remote selenium browser');
    return new RemoteSeleniumBrowser(config, log);
  }

  return new Browser(config, log);
}

export { Browser };
