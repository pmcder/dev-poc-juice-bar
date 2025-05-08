'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { dynamoService, Recipe, ProductionRun } from '@/services/dynamodb';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { textractService } from '@/services/textract';

function AdminDashboard() {
  const { userAttributes, logout } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [runDate, setRunDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recipesData, runsData] = await Promise.all([
        dynamoService.getRecipes(),
        dynamoService.getProductionRuns()
      ]);
      setRecipes(recipesData);
      setProductionRuns(runsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipeName.trim()) return;

    try {
      await dynamoService.createRecipe(newRecipeName);
      setNewRecipeName('');
      loadData();
    } catch (error) {
      console.error('Error creating recipe:', error);
    }
  };

  const handleCreateProductionRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe || !runDate) return;

    const recipe = recipes.find(r => r.id === selectedRecipe);
    if (!recipe) return;

    try {
      await dynamoService.createProductionRun(recipe.id, recipe.name, runDate);
      setSelectedRecipe('');
      setRunDate('');
      loadData();
    } catch (error) {
      console.error('Error creating production run:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name, 'Size:', e.target.files[0].size);
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDocumentProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      // Check file size (AWS Textract has a 5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG, or PDF file.');
      }

      // Read file as ArrayBuffer with error handling
      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await selectedFile.arrayBuffer();
      } catch (readError) {
        console.error('Error reading file:', readError);
        throw new Error('Failed to read file. Please try again.');
      }

      // Convert to Uint8Array with validation
      const uint8Array = new Uint8Array(arrayBuffer);
      if (uint8Array.length === 0) {
        throw new Error('File appears to be empty');
      }

      const result = await textractService.analyzeDocument(uint8Array);
      setExtractedText(result);
    } catch (error) {
      console.error('Error processing document:', error);
      setExtractedText(error instanceof Error ? error.message : 'Error processing document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4 text-gray-900">Welcome, {userAttributes?.given_name || userAttributes?.email}</span>
              <button
                onClick={() => logout()}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recipe Management */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recipe Management</h2>
              <form onSubmit={handleCreateRecipe} className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRecipeName}
                    onChange={(e) => setNewRecipeName(e.target.value)}
                    placeholder="Enter recipe name"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Add Recipe
                  </button>
                </div>
              </form>
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Existing Recipes</h3>
                <ul className="divide-y divide-gray-200">
                  {recipes.map((recipe) => (
                    <li key={recipe.id} className="py-2 text-gray-900">
                      {recipe.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Production Run Management */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Production Run Management</h2>
              <form onSubmit={handleCreateProductionRun} className="mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select Recipe</label>
                    <select
                      value={selectedRecipe}
                      onChange={(e) => setSelectedRecipe(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                    >
                      <option value="">Select a recipe</option>
                      {recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Run Date</label>
                    <input
                      type="date"
                      value={runDate}
                      onChange={(e) => setRunDate(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Create Production Run
                  </button>
                </div>
              </form>
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Production Runs</h3>
                <ul className="divide-y divide-gray-200">
                  {productionRuns.map((run) => (
                    <li key={run.id} className="py-2">
                      <div className="flex justify-between">
                        <span className="text-gray-900">{run.recipeName}</span>
                        <span className="text-gray-500">{new Date(run.runDate).toLocaleDateString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Document Processing Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Processing</h2>
              <form onSubmit={handleDocumentProcess} className="mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Upload Document
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="mt-1 block w-full text-sm text-gray-900
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!selectedFile || isProcessing}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {isProcessing ? 'Processing...' : 'Process Document'}
                  </button>
                </div>
              </form>

              {extractedText && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Extracted Text:</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900">{extractedText}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TechnicianDashboard() {
  const { userAttributes, logout } = useAuth();
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProductionRuns();
  }, []);

  const loadProductionRuns = async () => {
    try {
      const runs = await dynamoService.getProductionRuns();
      setProductionRuns(runs);
    } catch (error) {
      console.error('Error loading production runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calendarEvents = productionRuns.map(run => ({
    title: run.recipeName,
    date: run.runDate,
    backgroundColor: '#4F46E5', // Indigo color
    borderColor: '#4F46E5',
    textColor: '#ffffff'
  }));

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Technician Dashboard</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4 text-gray-900">Welcome, {userAttributes?.given_name || userAttributes?.email}</span>
              <button
                onClick={() => logout()}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Production Schedule</h2>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-lg text-gray-900">Loading calendar...</div>
              </div>
            ) : (
              <div className="calendar-container">
                <FullCalendar
                  plugins={[dayGridPlugin]}
                  initialView="dayGridMonth"
                  events={calendarEvents}
                  height="auto"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek'
                  }}
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    meridiem: false
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, userGroups, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  // Check if user is in admin group
  const isAdmin = userGroups.includes('admin');
  const isTechnician = userGroups.includes('technician');

  if (!isAdmin && !isTechnician) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-red-500">Access Denied: No valid role assigned</div>
      </div>
    );
  }

  return isAdmin ? <AdminDashboard /> : <TechnicianDashboard />;
} 