import { TaskContext } from "compose";
import { CONTRACT_ADDRESS } from "../constants";

type TaskPayload = {
  commitmentId: string;
  completed: boolean;
}

export async function main({ evm, env }: TaskContext, { commitmentId, completed }: TaskPayload) {
  const wallet = await evm.wallet({ name: "escrow-owner", privateKey: env.PRIVATE_ESCROW_OWNER_KEY });

  const onchainResponse = await wallet.writeContract(
    evm.chains.baseSepolia,
    CONTRACT_ADDRESS,
    "write(bytes32,bytes32)",
    [commitmentId, completed], // todo check actual args
  );

  return {
    success: true,
    transactionHash: onchainResponse.hash,
    commitmentId,
  };
}

