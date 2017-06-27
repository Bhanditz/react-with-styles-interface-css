import { JSDOM } from 'jsdom';
import values from 'object.values';
import globalCache from 'global-cache';
import { StyleSheetServer, StyleSheet, css as compile } from 'aphrodite/no-important';

import { GLOBAL_CACHE_KEY, MAX_SPECIFICITY } from '../constants';
import CSSInterface from 'react-with-styles-interface-css';
import getClassName from '../getClassName';

const defaultGlobalValue = { namespace: '', CSS: '' };

let ReactDOM;
let hasReactDOM = false;
try {
  ReactDOM = require('react-dom');
  hasReactDOM = true;
} catch(err) {}

let oldWindow;
let oldDocument;
let oldReactDOMRender;
let oldGlobalState;
let oldCSSInterfaceCreate;

function getCSS(stylesObject, componentName = '') {
  const sharedState = globalCache.get(GLOBAL_CACHE_KEY);

  const styleSheet = StyleSheet.create(stylesObject);
  Object.keys(styleSheet).forEach((styleName) => {
    const styleSheetObject = styleSheet[styleName];
    const { namespace = '' } = sharedState;
    const className = getClassName(namespace, componentName, styleName);

    let extendedClassName = `${className}`;
    for (let i = 1; i <= MAX_SPECIFICITY; i++) {
      const repeatedSpecifier = `.${className}_${i}`.repeat(i);
      extendedClassName += `,${repeatedSpecifier}`;
    }
    styleSheetObject._name = extendedClassName;
  });
  const { css: CSSInfo } = StyleSheetServer.renderStatic(() => {
    values(styleSheet).forEach((style) => {
      compile(style);
    });
  });
  const { content: newCSS } = CSSInfo;

  // Prepend newCSS so the entry point styles appear at the top of the stylesheet
  const { CSS } = sharedState;
  sharedState.CSS = newCSS + CSS;
}

function prepareCompilationEnvironment() {
  oldWindow = global.window;
  oldDocument = global.document;
  console.log(oldDocument);

  const { window: jsdomWindow } = new JSDOM();
  const { document: jsdomDocument } = jsdomWindow;

  global.window = jsdomWindow;
  global.document = jsdomDocument;

  oldGlobalState = globalCache.get(GLOBAL_CACHE_KEY);
  globalCache.set(GLOBAL_CACHE_KEY, defaultGlobalValue);

  if (hasReactDOM) {
    oldReactDOMRender = ReactDOM.render;
    ReactDOM.render = function noopReactDOMRender() {};
  }

  oldCSSInterfaceCreate = CSSInterface.create;
  CSSInterface.create = getCSS;
}

function cleanupCompilationEnvironment() {
  global.window = oldWindow;
  global.document = oldDocument;
  globalCache.set(GLOBAL_CACHE_KEY, oldGlobalState);
  if (hasReactDOM) ReactDOM.render = oldReactDOMRender;
  CSSInterface.create = oldCSSInterfaceCreate;
}

export {
  defaultGlobalValue,
  getCSS,
  prepareCompilationEnvironment,
  cleanupCompilationEnvironment,
};
