import { TaskContext } from "compose";

export async function main(hostFunctions: TaskContext) {
  const { logEvent, fetch, evm, collection } = hostFunctions;

  try {
    const wallet = await evm.wallet({ name: "bitcoin-oracle-wallet" });

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

    const onchainResponse = await wallet.writeContract(
      evm.chains.polygonAmoy,
      "0x34a264BCD26e114eD6C46a15d0A3Ba1873CaA708",
      "write(bytes32,bytes32)",
      [timestampAsBytes32, priceAsBytes32],
    );

    // Store the price in a collection
    const priceHistory = await collection("bitcoin_prices");
    const { id } = await priceHistory.insertOne({
      price: bitcoinPrice,
      timestamp: timestamp
    });

    console.log(`Bitcoin price updated: $${bitcoinPrice} at ${timestamp}`);

    return {
      success: true,
      oracleHash: onchainResponse.hash,
      price: bitcoinPrice,
      timestamp,
      priceId: id,
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

