import React, { useState, useRef } from 'react';
import { Play, RotateCcw, Eye, Terminal as TerminalIcon, Loader2 } from 'lucide-react';

interface ExecutionPanelProps {
  code: string;
  language: string;
}

interface ConsoleEntry {
  text: string;
  type: 'log' | 'warn' | 'error' | 'system' | 'return';
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ code, language }) => {
  const [activeTab, setActiveTab] = useState<'console' | 'preview'>('console');
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const pyodideRef = useRef<any>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addEntry = (text: string, type: ConsoleEntry['type']) => {
    setEntries((prev) => [...prev, { text, type }]);
  };

  const loadPyodide = async () => {
    if (pyodideRef.current) return pyodideRef.current;

    setPyodideLoading(true);
    addEntry('Loading Python runtime (WebAssembly) from CDN...', 'system');

    return new Promise((resolve, reject) => {
      if (!document.getElementById('pyodide-cdn')) {
        const script = document.createElement('script');
        script.id = 'pyodide-cdn';
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js';
        script.onload = async () => {
          try {
            const pyodide = await (window as any).loadPyodide({
              indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/',
            });
            pyodideRef.current = pyodide;
            setPyodideLoading(false);
            addEntry('Python runtime loaded successfully!', 'system');
            resolve(pyodide);
          } catch (err: any) {
            addEntry(`Failed to initialise Pyodide: ${err.message}`, 'error');
            setPyodideLoading(false);
            reject(err);
          }
        };
        script.onerror = () => {
          addEntry('Failed to load Pyodide script from CDN.', 'error');
          setPyodideLoading(false);
          reject(new Error('CDN load failed'));
        };
        document.body.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (pyodideRef.current) {
            clearInterval(checkInterval);
            setPyodideLoading(false);
            resolve(pyodideRef.current);
          }
        }, 500);
      }
    });
  };

  const formatArg = (a: any): string => {
    if (a === null) return 'null';
    if (a === undefined) return 'undefined';
    if (typeof a === 'object') {
      try { return JSON.stringify(a, null, 2); } catch { return String(a); }
    }
    return String(a);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setEntries([]);

    if (language === 'javascript' || language === 'typescript') {
      const origLog   = window.console.log;
      const origWarn  = window.console.warn;
      const origError = window.console.error;
      const origInfo  = window.console.info;

      const captured: ConsoleEntry[] = [];

      // Shadow console object to intercept logs cleanly without global side-effects
      const customConsole = {
        log: (...args: any[]) => {
          origLog(...args);
          captured.push({ text: args.map(formatArg).join(' '), type: 'log' });
        },
        warn: (...args: any[]) => {
          origWarn(...args);
          captured.push({ text: args.map(formatArg).join(' '), type: 'warn' });
        },
        error: (...args: any[]) => {
          origError(...args);
          captured.push({ text: args.map(formatArg).join(' '), type: 'error' });
        },
        info: (...args: any[]) => {
          origInfo(...args);
          captured.push({ text: args.map(formatArg).join(' '), type: 'log' });
        }
      };

      // Attach to window temporarily to bypass minification renaming in production builds
      (window as any).__collabexConsole = customConsole;

      try {
        // shadow the global console object using parameter shadowing in async IIFE
        // wrapped with newlines to ensure single-line comments don't comment out the closing brace
        const wrappedCode = `(async (console) => {\n${code}\n})(window.__collabexConsole)`;
        const result = await eval(wrappedCode); // eslint-disable-line no-eval

        if (captured.length === 0) {
          if (result !== undefined) {
            captured.push({ text: `→ ${formatArg(result)}`, type: 'return' });
          } else {
            captured.push({ text: 'Executed successfully. No output produced.', type: 'system' });
          }
        }

        setEntries(captured);
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setEntries([...captured, { text: `Runtime Error: ${errMsg}`, type: 'error' }]);
      } finally {
        delete (window as any).__collabexConsole;
      }
    } else if (language === 'python') {
      try {
        const pyodide: any = await loadPyodide();
        const outputLines: ConsoleEntry[] = [];

        pyodide.setStdout({
          batched: (text: string) => {
            text.split('\n').filter(Boolean).forEach((line) => {
              outputLines.push({ text: line, type: 'log' });
            });
          },
        });

        pyodide.setStderr({
          batched: (text: string) => {
            text.split('\n').filter(Boolean).forEach((line) => {
              outputLines.push({ text: line, type: 'error' });
            });
          },
        });

        await pyodide.runPythonAsync(code);

        if (outputLines.length === 0) {
          outputLines.push({ text: 'Python executed successfully. No output produced.', type: 'system' });
        }

        setEntries(outputLines);
      } catch (err: any) {
        setEntries((prev) => [...prev, { text: `Python Error: ${err.message}`, type: 'error' }]);
      }
    } else {
      setEntries([{ text: `Preview mode active. Switch to the "Live Preview" tab.`, type: 'system' }]);
      setActiveTab('preview');
    }

    setIsRunning(false);
    setTimeout(scrollToBottom, 50);
  };

  const handleClear = () => setEntries([]);

  const getPreviewHtml = (): string => {
    if (language === 'html') {
      return code;
    }
    if (language === 'css') {
      return `<!DOCTYPE html><html><head><style>${code}</style></head><body><div style="font-family: sans-serif; padding: 20px; color: #333;"><h1>CSS Style Preview</h1><p>The style has been applied to this page.</p></div></body></html>`;
    }
    if (language === 'markdown') {
      const htmlContent = code
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n$/gim, '<br />');
      return `<!DOCTYPE html><html><head><style>body { font-family: sans-serif; padding: 20px; color: #fff; background-color: #1e1e1e; min-height: 100vh; }</style></head><body>${htmlContent}</body></html>`;
    }
    return `<!DOCTYPE html><html><head><style>body { font-family: sans-serif; padding: 20px; color: #fff; background-color: #1e1e1e; }</style></head><body><h3>${language} — no live preview</h3><pre>${code}</pre></body></html>`;
  };

  const getEntryClass = (type: ConsoleEntry['type']) => {
    if (type === 'error') return 'console-line error';
    if (type === 'warn')  return 'console-line warn';
    if (type === 'system') return 'console-line system';
    if (type === 'return') return 'console-line return-val';
    return 'console-line';
  };

  const getPrefix = (type: ConsoleEntry['type']) => {
    if (type === 'warn')  return '⚠ ';
    if (type === 'error') return '✖ ';
    if (type === 'return') return '';
    return '› ';
  };

  return (
    <div className="execution-panel glassmorphism">
      <div className="panel-header">
        <div className="panel-tabs">
          <button
            type="button"
            className={`panel-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            <TerminalIcon size={14} />
            <span>Console Output</span>
          </button>
          <button
            type="button"
            className={`panel-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={14} />
            <span>Live Preview</span>
          </button>
        </div>

        <div className="panel-actions">
          {activeTab === 'console' && (
            <button
              type="button"
              className="panel-btn run-btn button-ripple"
              onClick={handleRunCode}
              disabled={isRunning || pyodideLoading}
            >
              {isRunning || pyodideLoading ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
              <span>{pyodideLoading ? 'Loading Wasm...' : isRunning ? 'Running...' : 'Run Code'}</span>
            </button>
          )}
          <button type="button" className="panel-btn" onClick={handleClear} title="Clear console">
            <RotateCcw size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="panel-content">
        {activeTab === 'console' ? (
          <div className="console-display">
            {entries.length === 0 ? (
              <div className="console-empty">
                <TerminalIcon size={24} className="console-empty-icon" />
                <p>Console is empty. Click "Run Code" to execute JS or Python.</p>
              </div>
            ) : (
              entries.map((entry, index) => (
                <div key={index} className={getEntryClass(entry.type)}>
                  <span className="console-prefix">{getPrefix(entry.type)}</span>
                  <span className="console-text">{entry.text}</span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        ) : (
          <div className="preview-display">
            <iframe
              srcDoc={getPreviewHtml()}
              title="Execution Preview"
              sandbox="allow-scripts"
              className="preview-iframe"
            />
          </div>
        )}
      </div>
    </div>
  );
};
