import React, { useState } from 'react';
import { apiClient } from '../utils/api';
import { WorkflowRequest, WorkflowResponse } from '../types';

const Workflow: React.FC = () => {
  const [workflowName, setWorkflowName] = useState<string>('');
  const [workflowParams, setWorkflowParams] = useState<string>('{}');
  const [result, setResult] = useState<WorkflowResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowName.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      let params: Record<string, any> = {};
      if (workflowParams.trim()) {
        params = JSON.parse(workflowParams);
      }

      const request: WorkflowRequest = {
        name: workflowName.trim(),
        params
      };

      const response = await apiClient.runWorkflow(request);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParamsChange = (value: string) => {
    setWorkflowParams(value);
    setError('');
  };

  const validateJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  const isJsonValid = validateJson(workflowParams);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Workflow Runner</h1>
          <p className="text-gray-600 mt-2">
            Execute workflows with custom parameters. This is a stub implementation that echoes back your input.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workflow Name *
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Enter workflow name"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parameters (JSON)
            </label>
            <textarea
              value={workflowParams}
              onChange={(e) => handleParamsChange(e.target.value)}
              placeholder='{"key": "value", "number": 123}'
              className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                workflowParams.trim() && !isJsonValid
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              rows={6}
            />
            {workflowParams.trim() && !isJsonValid && (
              <p className="mt-1 text-sm text-red-600">
                Invalid JSON format
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!workflowName.trim() || (workflowParams.trim() && !isJsonValid) || isLoading}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Running...' : 'Run Workflow'}
            </button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mx-6 mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Workflow Result</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-green-700">Name:</span>
                <span className="ml-2 text-green-600">{result.name}</span>
              </div>
              <div>
                <span className="font-medium text-green-700">Status:</span>
                <span className="ml-2 text-green-600">{result.status}</span>
              </div>
              <div>
                <span className="font-medium text-green-700">Request ID:</span>
                <span className="ml-2 text-green-600 font-mono text-sm">{result.request_id}</span>
              </div>
              <div>
                <span className="font-medium text-green-700">Result:</span>
                <pre className="mt-2 p-3 bg-white border border-green-200 rounded text-sm text-gray-800 overflow-x-auto">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflow;
