import React, { useState, useEffect, useMemo } from 'react';
import { fetchUserHoldings } from './tokenService'; // Assuming this service exists and is configured

// --- Type Definitions ---
// These should ideally match the structure returned by the JSON API for your Daml contracts.

/**
 * Represents a single tokenized asset holding for an investor.
 * Mirrors the fields of a potential `AssetHolding` Daml template.
 */
export interface AssetHolding {
  contractId: string;
  templateId: string;
  payload: {
    owner: string;
    issuer: string;
    assetId: string;
    assetType: 'Real Estate' | 'Private Equity' | 'Fund Unit' | 'Equity';
    description: string;
    quantity: string; // Decimals from Daml are often returned as strings
    pricePerUnit: string; // Decimals from Daml are often returned as strings
  };
}

/**
 * Calculated portfolio summary data.
 */
interface PortfolioSummary {
  totalValue: number;
  assetCount: number;
  bestPerformingAsset: string;
  worstPerformingAsset: string; // Example of a more complex metric
}

/**
 * Enriched asset data for display purposes.
 */
interface DisplayHolding {
  id: string;
  description: string;
  assetType: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  portfolioPercentage: number;
}


// --- Helper Functions ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};


// --- Main Component ---

/**
 * PortfolioView component displays an investor's tokenized asset holdings,
 * providing a summary and a detailed breakdown.
 */
const PortfolioView: React.FC = () => {
  const [holdings, setHoldings] = useState<AssetHolding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // In a real app, these would come from an auth context or config
  const currentUserParty = 'investor::1220...'; 
  const authToken = 'your-jwt-token-here';

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch raw holdings from the ledger via the token service
        const userHoldings = await fetchUserHoldings(currentUserParty, authToken);
        setHoldings(userHoldings);
      } catch (err) {
        console.error("Failed to fetch portfolio:", err);
        setError("Could not load your portfolio. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [currentUserParty, authToken]);

  const { displayHoldings, summary } = useMemo(() => {
    if (!holdings.length) {
      return { displayHoldings: [], summary: null };
    }

    const totalValue = holdings.reduce((acc, holding) => {
      return acc + parseFloat(holding.payload.quantity) * parseFloat(holding.payload.pricePerUnit);
    }, 0);
    
    const enrichedHoldings: DisplayHolding[] = holdings.map(holding => {
        const quantity = parseFloat(holding.payload.quantity);
        const pricePerUnit = parseFloat(holding.payload.pricePerUnit);
        const value = quantity * pricePerUnit;
        
        return {
            id: holding.payload.assetId,
            description: holding.payload.description,
            assetType: holding.payload.assetType,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            totalValue: value,
            portfolioPercentage: totalValue > 0 ? value / totalValue : 0,
        };
    }).sort((a, b) => b.totalValue - a.totalValue); // Sort by value descending

    const portfolioSummary: PortfolioSummary = {
        totalValue: totalValue,
        assetCount: holdings.length,
        bestPerformingAsset: enrichedHoldings[0]?.description || 'N/A',
        worstPerformingAsset: enrichedHoldings[enrichedHoldings.length - 1]?.description || 'N/A',
    };

    return { displayHoldings: enrichedHoldings, summary: portfolioSummary };

  }, [holdings]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Portfolio...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 bg-red-100 rounded-lg">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Portfolio</h1>
          <p className="text-md text-gray-600 mt-1">
            A complete overview of your tokenized real-world assets.
          </p>
        </header>

        {summary && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-sm font-medium text-gray-500">Total Portfolio Value</h3>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{formatCurrency(summary.totalValue)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-sm font-medium text-gray-500">Number of Assets</h3>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{summary.assetCount}</p>
            </div>
             <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-sm font-medium text-gray-500">Largest Holding</h3>
              <p className="text-xl font-semibold text-gray-900 mt-2 truncate">{summary.bestPerformingAsset}</p>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Asset Breakdown</h2>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                {displayHoldings.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Asset</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Quantity</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Market Price</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total Value</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">% of Portfolio</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {displayHoldings.map((asset) => (
                            <tr key={asset.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{asset.description}</div>
                                    <div className="text-xs text-gray-500">{asset.assetType}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">{asset.quantity.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">{formatCurrency(asset.pricePerUnit)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">{formatCurrency(asset.totalValue)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">{formatPercentage(asset.portfolioPercentage)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center p-12 text-gray-500">
                        You do not currently hold any tokenized assets.
                    </div>
                )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PortfolioView;