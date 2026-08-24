import React from 'react';
import Chat from './components/Chat';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex space-x-8">
            <div className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600">
              Chat
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="py-8">
        <Chat />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>Ollama BP Automation - Version 0.1.0</p>
            <p className="mt-1">
              API Base URL: {(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
