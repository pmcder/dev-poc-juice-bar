'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { dynamoService, Recipe, ProductionRun } from '@/services/dynamodb';

function AdminDashboard() {
  const { userAttributes, logout } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [runDate, setRunDate] = useState('');

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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4">Welcome, {userAttributes?.given_name || userAttributes?.email}</span>
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
              <h2 className="text-xl font-semibold mb-4">Recipe Management</h2>
              <form onSubmit={handleCreateRecipe} className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRecipeName}
                    onChange={(e) => setNewRecipeName(e.target.value)}
                    placeholder="Enter recipe name"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                <h3 className="font-medium">Existing Recipes</h3>
                <ul className="divide-y divide-gray-200">
                  {recipes.map((recipe) => (
                    <li key={recipe.id} className="py-2">
                      {recipe.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Production Run Management */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Production Run Management</h2>
              <form onSubmit={handleCreateProductionRun} className="mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select Recipe</label>
                    <select
                      value={selectedRecipe}
                      onChange={(e) => setSelectedRecipe(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                <h3 className="font-medium">Production Runs</h3>
                <ul className="divide-y divide-gray-200">
                  {productionRuns.map((run) => (
                    <li key={run.id} className="py-2">
                      <div className="flex justify-between">
                        <span>{run.recipeName}</span>
                        <span className="text-gray-500">{new Date(run.runDate).toLocaleDateString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TechnicianDashboard() {
  const { userAttributes, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Technician Dashboard</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4">Welcome, {userAttributes?.given_name || userAttributes?.email}</span>
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
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-4">
            <h2 className="text-2xl font-bold mb-4">Welcome to your Technician Dashboard</h2>
            <div className="space-y-4">
              <div className="bg-white shadow rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{userAttributes?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email Verified</p>
                    <p className="font-medium">{userAttributes?.email_verified === 'true' ? 'Yes' : 'No'}</p>
                  </div>
                  {userAttributes?.name && (
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{userAttributes.name}</p>
                    </div>
                  )}
                  {userAttributes?.phone_number && (
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium">{userAttributes.phone_number}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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