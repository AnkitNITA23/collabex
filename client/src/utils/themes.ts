import { EditorView } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// 1. One Dark Theme
import { oneDark } from '@codemirror/theme-one-dark';

// 2. Nord Theme
const nordTheme = EditorView.theme({
  '&': {
    color: '#d8dee9',
    backgroundColor: '#2e3440'
  },
  '.cm-content': {
    caretColor: '#88c0d0'
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#88c0d0' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#434c5e' },
  '.cm-gutters': {
    backgroundColor: '#2e3440',
    color: '#4c566a',
    border: 'none'
  },
  '.cm-activeLine': { backgroundColor: '#3b4252' },
  '.cm-activeLineGutter': { backgroundColor: '#3b4252' }
}, { dark: true });

const nordHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#81a1c1' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#8fbcbb' },
  { tag: [t.variableName], color: '#d8dee9' },
  { tag: [t.function(t.variableName), t.labelName], color: '#88c0d0' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#deb887' },
  { tag: [t.definition(t.name), t.separator], color: '#8fbcbb' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#b48ead' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#88c0d0' },
  { tag: [t.meta, t.comment], color: '#4c566a', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#88c0d0', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#81a1c1' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#b48ead' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#a3be8c' }
]);

const nordThemeExtension: Extension = [nordTheme, syntaxHighlighting(nordHighlight)];

// 3. Monokai Theme
const monokaiTheme = EditorView.theme({
  '&': {
    color: '#f8f8f2',
    backgroundColor: '#272822'
  },
  '.cm-content': {
    caretColor: '#f8f8f0'
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#f8f8f0' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#49483e' },
  '.cm-gutters': {
    backgroundColor: '#272822',
    color: '#90908a',
    border: 'none'
  },
  '.cm-activeLine': { backgroundColor: '#3e3d32' },
  '.cm-activeLineGutter': { backgroundColor: '#3e3d32' }
}, { dark: true });

const monokaiHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#f92672' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#a6e22e' },
  { tag: [t.variableName], color: '#f8f8f2' },
  { tag: [t.function(t.variableName), t.labelName], color: '#66d9ef' },
  { tag: [t.definition(t.name), t.separator], color: '#fd971f' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#ae81ff' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#f92672' },
  { tag: [t.meta, t.comment], color: '#75715e', fontStyle: 'italic' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#ae81ff' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#e6db74' }
]);

const monokaiThemeExtension: Extension = [monokaiTheme, syntaxHighlighting(monokaiHighlight)];

// 4. Solarized Dark Theme
const solarizedDarkTheme = EditorView.theme({
  '&': {
    color: '#839496',
    backgroundColor: '#002b36'
  },
  '.cm-content': {
    caretColor: '#839496'
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#839496' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#073642' },
  '.cm-gutters': {
    backgroundColor: '#002b36',
    color: '#586e75',
    border: 'none'
  },
  '.cm-activeLine': { backgroundColor: '#073642' },
  '.cm-activeLineGutter': { backgroundColor: '#073642' }
}, { dark: true });

const solarizedDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#859900' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#268bd2' },
  { tag: [t.variableName], color: '#839496' },
  { tag: [t.function(t.variableName), t.labelName], color: '#268bd2' },
  { tag: [t.definition(t.name), t.separator], color: '#cb4b16' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#b58900' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#93a1a1' },
  { tag: [t.meta, t.comment], color: '#586e75', fontStyle: 'italic' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#d33682' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#2aa198' }
]);

const solarizedDarkExtension: Extension = [solarizedDarkTheme, syntaxHighlighting(solarizedDarkHighlight)];

// 5. GitHub Light Theme
const githubLightTheme = EditorView.theme({
  '&': {
    color: '#24292f',
    backgroundColor: '#ffffff'
  },
  '.cm-content': {
    caretColor: '#0969da'
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#0969da' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#add6ff' },
  '.cm-gutters': {
    backgroundColor: '#ffffff',
    color: '#57606a',
    border: 'none',
    borderRight: '1px solid #d0d7de'
  },
  '.cm-activeLine': { backgroundColor: '#f6f8fa' },
  '.cm-activeLineGutter': { backgroundColor: '#f6f8fa' }
}, { dark: false });

const githubLightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#cf222e' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#953800' },
  { tag: [t.variableName], color: '#24292f' },
  { tag: [t.function(t.variableName), t.labelName], color: '#8250df' },
  { tag: [t.definition(t.name), t.separator], color: '#bc4c00' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#0550ae' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#24292f' },
  { tag: [t.meta, t.comment], color: '#6e7781', fontStyle: 'italic' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#0550ae' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#1a7f37' }
]);

const githubLightExtension: Extension = [githubLightTheme, syntaxHighlighting(githubLightHighlight)];

// Helper to resolve theme
export function getThemeExtension(themeName: string): Extension {
  switch (themeName) {
    case 'one-dark':
      return oneDark;
    case 'nord':
      return nordThemeExtension;
    case 'monokai':
      return monokaiThemeExtension;
    case 'solarized-dark':
      return solarizedDarkExtension;
    case 'github-light':
      return githubLightExtension;
    default:
      return oneDark;
  }
}
