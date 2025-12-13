/// <reference types="../.compose/types.d.ts" />

  export async function main(hostFunctions: TaskHostFunctions) {
  const { logEvent, fetch, stage, writeContract, chains } = hostFunctions;

  try {
    // Log the start of the Bitcoin price oracle task
    await logEvent({
      code: "BITCOIN_ORACLE_START",
      message: "Starting Bitcoin price oracle task",
      data: JSON.stringify({ timestamp: new Date().toISOString() })
    });

    // Fetch Bitcoin price from CoinGecko API
    const response = await fetch<{ bitcoin: { usd: number } }>(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      {
        maxRetryAttempts: 3,
        initialRetryIntervalMillis: 1000,
        retryIntervalFactor: 2
      }
    );

    if (!response) {
      throw new Error("Failed to fetch Bitcoin price");
    }

    const bitcoinPrice = response.bitcoin.usd;
    const timestamp = Date.now();

    // Convert timestamp and price to bytes32 format
    const timestampAsBytes32 = `0x${timestamp.toString(16).padStart(64, '0')}`;
    const priceAsBytes32 = `0x${Math.round(bitcoinPrice * 100).toString(16).padStart(64, '0')}`;

    const onchainResponse = await writeContract(
      chains.polygonAmoy,
      "0x34a264BCD26e114eD6C46a15d0A3Ba1873CaA708",
      "write(bytes32,bytes32)",
      [timestampAsBytes32, priceAsBytes32],
    );

    // Store the price in a collection
    const priceHistory = await stage.collection("bitcoin_prices");
    const { id } = await priceHistory.insertOne({
      price: bitcoinPrice,
      timestamp: timestamp
    });

    // Read the latest price we just inserted
    const latestPrice = await priceHistory.getById(id);

    // Get all price history
    const allPrices = await priceHistory.list({ limit: 10 });

    // Log successful price update
    await logEvent({
      code: "BITCOIN_PRICE_UPDATED",
      message: `Bitcoin price updated to $${bitcoinPrice}`,
      data: JSON.stringify({ 
        price: bitcoinPrice, 
        timestamp: timestamp,
        historicalCount: allPrices.length
      })
    });

    console.log(`Bitcoin price updated: $${bitcoinPrice} at ${timestamp}`);
    console.log(`Total historical prices: ${allPrices.length}`);

    return {
      success: true,
      price: bitcoinPrice,
      timestamp,
      priceId: id,
      historicalCount: allPrices.length
    };

  } catch (error) {
    // Log any errors that occur
    await logEvent({
      code: "BITCOIN_ORACLE_ERROR",
      message: `Bitcoin oracle error: ${(error as Error).message}`,
      data: JSON.stringify({ 
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      })
    });

    throw error;
  }
}

