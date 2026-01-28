import React from 'react';

const InventoryHighlights = ({ products, loading }) => {
    if (loading) {
        return (
            <div className="inventory-highlights loading">
                <div className="loading-shimmer">Cargando productos estrella...</div>
            </div>
        );
    }

    if (!products || products.length === 0) return null;

    return (
        <section className="inventory-highlights">
            <div className="section-header">
                <h2>📦 Productos Estrella (Stock Odoo)</h2>
                <span className="live-indicator">LIVE</span>
            </div>
            <div className="highlights-scroll">
                {products.map((product) => (
                    <div key={product.id} className="stock-card">
                        <div className="stock-info">
                            <h3>{product.name}</h3>
                            <div className="stock-stats">
                                <span className={`stat-pill stock ${product.qty_available < 10 ? 'low' : ''}`}>
                                    {product.qty_available} en stock
                                </span>
                                <span className="stat-pill price">
                                    ${Number(product.list_price).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="stock-bar">
                            <div
                                className="stock-fill"
                                style={{ width: `${Math.min(100, (product.qty_available / 50) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default InventoryHighlights;
