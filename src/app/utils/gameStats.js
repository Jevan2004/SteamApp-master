export function categorizeGamesByPrice(games) {
    if (!games || games.length === 0) return { cheap: [], average: [], expensive: [] };
  
    // Extract all numeric prices
    const numericPrices = games
      .map(game => {
        // Remove all non-numeric characters except dots
        const priceStr = game.price.replace(/[^0-9.]/g, '');
        return priceStr ? parseFloat(priceStr) : 0;
      })
      .filter(price => !isNaN(price)) // Remove any invalid numbers
      .sort((a, b) => a - b); // Sort from lowest to highest
  
    if (numericPrices.length === 0) return { cheap: [], average: [], expensive: [] };
  
    // Calculate price thresholds
    const count = numericPrices.length;
    const cheapThreshold = numericPrices[Math.floor(count / 3)];
    const averageThreshold = numericPrices[Math.floor((2 * count) / 3)];
  
    // Categorize games
    return games.reduce((acc, game) => {
      const priceStr = game.price.replace(/[^0-9.]/g, '');
      const price = priceStr ? parseFloat(priceStr) : 0;
  
      if (price <= cheapThreshold) {
        acc.cheap.push(game);
      } else if (price <= averageThreshold) {
        acc.average.push(game);
      } else {
        acc.expensive.push(game);
      }
  
      return acc;
    }, { cheap: [], average: [], expensive: [] });
  }