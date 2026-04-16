"use client";

import React, { Component, ReactNode } from "react";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught an error:", error);
    toast.error("Ocurrió un error inesperado en la interfaz.");
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-gray-900 border border-gray-800 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">¡Ups! Algo salió mal</h2>
            <p className="text-gray-400 mb-6">
              Ha ocurrido un error inesperado. Estamos trabajando para solucionarlo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Recargar página
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
