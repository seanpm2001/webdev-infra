/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const path = require('path');

// mdnBcd being only imported for types
// eslint-disable-next-line no-unused-vars
const mdnBcd = require('@mdn/browser-compat-data');
const Nunjucks = require('nunjucks');

const bcd = require('../../utils/browserCompat');
const {i18n} = require('../../utils/dictionary');

const BROWSERS = ['chrome', 'firefox', 'edge', 'safari'];
const DATA = bcd();

const TEMPLATE = new Nunjucks.Template(
  fs.readFileSync(path.join(__dirname, 'template.njk'), {encoding: 'utf-8'})
);
const ICONS = BROWSERS.reduce((icons, browser) => {
  icons[browser] = fs.readFileSync(
    path.join(__dirname, `icons/${browser}.svg`),
    {encoding: 'utf-8'}
  );
  return icons;
}, {});

/**
 * @param {mdnBcd.SimpleSupportStatement} support
 * @param {mdnBcd.StatusBlock | undefined} status
 * @returns {{aria: string, compatProperty: string, icon: string}}}
 */
function getInfoFromSupportStatement(support, status, locale) {
  if (status && status.deprecated) {
    return {
      aria: i18n('i18n.browser_compat.deprecated', locale),
      compatProperty: 'deprecated',
      icon: '🗑',
    };
  }

  if (!support.version_removed) {
    if (support.version_added === 'preview') {
      return {
        aria: i18n('i18n.browser_compat.preview', locale),
        compatProperty: 'preview',
        icon: '👁',
      };
    }

    if (support.flags && support.flags.length > 0) {
      return {
        aria: i18n('i18n.browser_compat.flag', locale),
        compatProperty: 'flag',
        icon: '⚑',
      };
    }

    if (typeof support.version_added === 'string') {
      return {
        aria: i18n('i18n.browser_compat.supported', locale),
        compatProperty: 'yes',
        icon: support.version_added,
      };
    }

    // See https://github.com/GoogleChrome/web.dev/issues/8333
    if (support.version_added === true) {
      return {
        aria: i18n('i18n.browser_compat.supported', locale),
        compatProperty: 'yes',
        icon: '✅',
      };
    }
  }

  return {
    aria: i18n('i18n.browser_compat.not_supported', locale),
    compatProperty: 'no',
    icon: '×',
  };
}

/**
 * @this ShortcodeContext
 * @param {*} feature
 */
function BrowserCompat(feature) {
  const locale = this.ctx.locale;
  if (!DATA) {
    throw new Error(
      '[BrowserCompat shortcode] Browser Compat data is not available.'
    );
  }

  const shortcodeContext = {};
  if (DATA[feature] && DATA[feature].support) {
    shortcodeContext.browsers = BROWSERS.map(browser => {
      const support = Array.isArray(DATA[feature].support[browser])
        ? DATA[feature].support[browser][0]
        : DATA[feature].support[browser];

      const supportInfo = getInfoFromSupportStatement(
        support,
        DATA[feature].status,
        locale
      );

      const isSupported = support.version_added && !support.version_removed;

      const ariaLabel = [
        browser,
        isSupported ? ` ${support.version_added}, ` : ', ',
        supportInfo.aria,
      ].join('');

      return {
        name: browser,
        supportInfo,
        ariaLabel,
        compat: supportInfo.compatProperty,
        supportIcon: supportInfo.icon,
        browserIcon: ICONS[browser],
      };
    });

    shortcodeContext.source = DATA[feature].mdn_url;
    shortcodeContext.sourceLabel = i18n('i18n.browser_compat.source', locale);
    shortcodeContext.supportLabel = i18n(
      'i18n.browser_compat.browser_support',
      locale
    );
  }

  return TEMPLATE.render({browserCompat: shortcodeContext});
}

module.exports = {BrowserCompat};