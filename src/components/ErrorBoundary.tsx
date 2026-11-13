import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GALAXYDUST_KERNEL_ERROR]:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: '#0C0D0E',
          color: '#22d3ee',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          padding: '24px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            backgroundColor: 'rgba(12, 13, 14, 0.95)',
            padding: '32px 24px',
            boxShadow: '0 0 40px rgba(6, 182, 212, 0.15)',
          }}>
            <h1 style={{
              fontSize: '16px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#67e8f9',
              margin: '0 0 16px 0',
              fontWeight: 'bold',
            }}>
              [ SISTEMA C.A.N. — MODO RECUPERACIÓN ]
            </h1>
            <p style={{
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.6',
              margin: '0 0 20px 0',
            }}>
              Se ha detectado una interrupción en el renderizado de la interfaz. Si hay una nueva versión disponible, puedes descargar el instalador o APK oficial directamente.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px',
                fontSize: '10px',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '20px',
                maxHeight: '100px',
              }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid #06b6d4',
                  color: '#67e8f9',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                REINTENTAR SINCRONIZACIÓN
              </button>

              <a
                href="https://github.com/amijares-hub/GalaxyDust-Juego-FrontEnd-/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: '#94a3b8',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  display: 'block',
                }}
              >
                DESCARGAR ÚLTIMA VERSIÓN OFICIAL
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

