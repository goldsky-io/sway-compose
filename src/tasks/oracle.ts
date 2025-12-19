import { TaskContext } from "compose";
import { CONTRACT_ADDRESS } from "../constants";

type TaskPayload = {
  commitmentId: number;
  completed: boolean;
}

export async function main({ evm, env }: TaskContext, { commitmentId, completed }: TaskPayload) {
  const wallet = await evm.wallet({ name: "escrow-owner", privateKey: env.PRIVATE_ESCROW_OWNER_KEY });

  const onchainResponse = await wallet.writeContract(
    evm.chains.baseSepolia,
    CONTRACT_ADDRESS,
    "resolveCommitment(uint256,bool)",
    [String(commitmentId), completed],
    { confirmations: 3 },
    {
      max_attempts: 2,
      initial_interval_ms: 1000,
      backoff_factor: 2,
    }
  );

  return {
    success: true,
    transactionHash: onchainResponse.hash,
    commitmentId,
  };
}

