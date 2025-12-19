import { TaskContext } from "compose";
import { CONTRACT_ADDRESS, USDC_ADDRESS } from "../constants";

type TaskPayload = {
  stakeAmount?: number; // Optional, defaults to 0.01 USDC (1 cent)
}

export async function main({ evm, env }: TaskContext, { stakeAmount = 1 }: TaskPayload) {
  const wallet = await evm.wallet({ name: "user", privateKey: env.PRIVATE_USER_KEY });

  // 1 USDC = 1,000,000 (6 decimals)
  const stakeAmountWei = String(stakeAmount * 1_000_000);

  // Step 1: Approve USDC spending for the contract
  const approveResponse = await wallet.writeContract(
    evm.chains.baseSepolia,
    USDC_ADDRESS,
    "approve(address,uint256)",
    [CONTRACT_ADDRESS, stakeAmountWei],
    { confirmations: 3 },
    {
      max_attempts: 2,
      initial_interval_ms: 1000,
      backoff_factor: 2,
    }
  );

  // Step 2: Create the commitment
  // Note: In production, you may want to wait for approval to be mined first
  const createCommitmentResponse = await wallet.writeContract(
    evm.chains.baseSepolia,
    CONTRACT_ADDRESS,
    "createCommitment(uint256)",
    [stakeAmountWei],
    { confirmations: 3 },
    {
      max_attempts: 2,
      initial_interval_ms: 1000,
      backoff_factor: 2,
    }
  );

  return {
    success: true,
    approvalHash: approveResponse.hash,
    createCommitmentResponse,  // : createCommitmentResponse.hash,
    stakeAmount: stakeAmount,
  };
}