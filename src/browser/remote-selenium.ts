import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { WebDriver, Builder as WebDriverBuilder } from 'selenium-webdriver';
import * as uniqueFilename from 'unique-filename';

import { Browser, RenderResponse, RenderOptions, RenderCSVResponse, RenderCSVOptions } from './browser';
import { Logger } from '../logger';
import { RenderingConfig } from '../config';

export class RemoteSeleniumBrowser extends Browser {
  readonly selenium_url: string;

  constructor(config: RenderingConfig, log: Logger) {
    super(config, log);

    if (config.selenium === undefined) {
      throw 'Selenium config not present';
    }
    this.selenium_url = config.selenium.url;
  }

  async start(): Promise<void> {
    return Promise.resolve();
  }

  getDriver(): WebDriver {
    return new WebDriverBuilder()
      .forBrowser('chrome')
      .usingServer(this.selenium_url)
      .build();
  }

  validateRenderOptions(options: RenderOptions) {
    if (options.headers) {
      throw new Error('Selenium rendering does not support custom headers');
    }
    if (options.timezone) {
      throw new Error('Selenium rendering does not support custom timezone');
    }
    if (options.deviceScaleFactor && options.deviceScaleFactor !== 1.0) {
      throw new Error('Selenium rendering does not support device scale factor');
    }
    if (options.encoding) {
      throw new Error('Selenium rendering does not support custom encoding');
    }
  }

  async render(options: RenderOptions): Promise<RenderResponse> {
    this.validateImageOptions(options);

    let driver: WebDriver;

    try {
      driver = this.getDriver();

      // Do an initial get so we can set the cookie for this domain.  This request will just take us to the login screen.
      driver.get(options.url);

      await driver
        .manage()
        .window()
        .setRect({
          width: options.width,
          height: options.height,
        });
      await driver.manage().addCookie({
        name: 'renderKey',
        value: options.renderKey,
      });

      let timeout: number = typeof options.timeout === 'string' ? parseFloat(options.timeout) : options.timeout;

      await driver.get(options.url);
      await driver.wait(async d => {
        return await d.executeScript(`const panelCount = document.querySelectorAll('.panel').length || document.querySelectorAll('.panel-container').length;
return window.panelsRendered >= panelCount;
		`);
      }, timeout * 1000);

      let imageB64 = await driver.takeScreenshot();

      if (!options.filePath) {
        options.filePath = uniqueFilename(tmpdir()) + '.png';
      }

      let imageBuffer = Buffer.from(imageB64, 'base64');
      await fs.writeFile(options.filePath, imageBuffer);

      return { filePath: options.filePath };
    } finally {
      if (driver) {
        await driver.close();
      }
    }
  }
}
