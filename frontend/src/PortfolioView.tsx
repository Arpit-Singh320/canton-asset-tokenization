import React, { useMemo } from 'react';
import { useParty, useStreamQueries } from '@c7/react';
import { Token } from '@daml.js/canton-asset-tokenization-0.1.0';
import './PortfolioView.css';

/**
 * A utility function to format a numeric string into a currency string.
 * @param amount - The amount to format, can be a string or number.
 * @param currency - The currency code (e.g., 'USD').
 * @returns A formatted currency string (e.g., "$1,234.56").
 */
const formatCurrency = (amount: string | number, currency: string = 'USD'): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(numericAmount);
};

/**
 * A type definition for the combined portfolio item data used for rendering.
 */
type PortfolioItem = {
  contractId: string;
  assetId: string;
  name: string;
  assetType: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  currency: string;
};

/**
 * Renders the investor's portfolio, showing a summary of total value and
 * a detailed breakdown of each asset holding.
 */
export const PortfolioView: React.FC = () => {
  const party = useParty();

  // Stream all asset definitions visible to the party. These act as master records.
  const { contracts: assets, loading: assetsLoading } = useStreamQueries(Token.Asset);

  // Stream all token holdings for the current party.
  const { contracts: holdings, loading: holdingsLoading } = useStreamQueries(Token.Holding, () => [{ owner: party }]);

  const isLoading = assetsLoading || holdingsLoading;

  /**
   * Processes and aggregates portfolio data.
   * This is memoized to prevent re-computation on every render unless the underlying
   * ledger data (assets or holdings) changes.
   */
  const portfolioData = useMemo(() => {
    if (isLoading || !assets || !holdings) {
      return { items: [], totalValue: 0, currency: 'USD' };
    }

    // Create a lookup map for efficient access to asset details by assetId.
    const assetMap = new Map(assets.map(asset => [asset.payload.assetId.unpack, asset.payload]));

    const portfolioItems: PortfolioItem[] = holdings
      .map(holding => {
        const assetDetails = assetMap.get(holding.payload.assetId.unpack);

        // If no corresponding asset definition is found, skip this holding.
        // This could happen in rare cases of data inconsistency.
        if (!assetDetails) {
          console.warn(`Could not find asset details for holding with assetId: ${holding.payload.assetId.unpack}`);
          return null;
        }

        const quantity = parseFloat(holding.payload.quantity);
        const pricePerUnit = parseFloat(assetDetails.price.amount);
        const totalValue = quantity * pricePerUnit;

        return {
          contractId: holding.contractId,
          assetId: assetDetails.assetId.unpack,
          name: assetDetails.description,
          assetType: assetDetails.assetType,
          quantity,
          pricePerUnit,
          totalValue,
          currency: assetDetails.price.currency,
        };
      })
      .filter((item): item is PortfolioItem => item !== null); // Type guard to filter out nulls

    const totalPortfolioValue = portfolioItems.reduce((sum, item) => sum + item.totalValue, 0);

    // Assuming a single currency for the total portfolio value for simplicity.
    const portfolioCurrency = portfolioItems.length > 0 ? portfolioItems[0].currency : 'USD';

    return {
      items: portfolioItems,
      totalValue: totalPortfolioValue,
      currency: portfolioCurrency,
    };
  }, [isLoading, assets, holdings]);


  if (isLoading) {
    return (
      <div className="portfolio-view loading-container">
        <p>Loading Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="portfolio-view">
      <header className="portfolio-header">
        <h1>My Portfolio</h1>
      </header>

      <section className="portfolio-summary-card">
        <div className="summary-item">
          <span className="summary-label">Total Portfolio Value</span>
          <span className="summary-value">
            {formatCurrency(portfolioData.totalValue, portfolioData.currency)}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Number of Assets</span>
          <span className="summary-value">{portfolioData.items.length}</span>
        </div>
      </section>

      <section className="portfolio-holdings-table">
        <h2>Asset Holdings</h2>
        {portfolioData.items.length === 0 ? (
          <div className="empty-state">
            <p>You do not currently hold any assets.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Asset Type</th>
                <th className="numeric">Quantity</th>
                <th className="numeric">Price per Unit</th>
                <th className="numeric">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {portfolioData.items.map(item => (
                <tr key={item.contractId}>
                  <td>{item.name}</td>
                  <td>{item.assetType}</td>
                  <td className="numeric">{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                  <td className="numeric">{formatCurrency(item.pricePerUnit, item.currency)}</td>
                  <td className="numeric">{formatCurrency(item.totalValue, item.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};