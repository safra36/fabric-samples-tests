import { Contract } from "@hyperledger/fabric-gateway";
import { LedgerMethods } from "../ledger-methods";
import { createHash } from "crypto";
import { ChannelState } from "../asset";
import { Wallet } from "../wallet.utils";

// Example usage

export async function setupPaymentChannel(
    contract: Contract,
    party1: Wallet,
    party2: Wallet,
    initialBalance1: number,
    initialBalance2: number
): Promise<string> {
    // 1. Create wallets if they don't exist
    try {
        await LedgerMethods.CreateWallet(contract, party1.address, party1.publicKey);
        await LedgerMethods.CreateWallet(contract, party2.address, party2.publicKey);
    } catch (error) {
        console.log('Wallets might already exist:', error);
    }

    // 2. Fund the wallets if needed
    const wallet1 = await LedgerMethods.GetWallet(contract, party1.address);
    const wallet2 = await LedgerMethods.GetWallet(contract, party2.address);

    if (wallet1.balance < initialBalance1) {
        throw new Error('Insufficient balance for party1');
    }
    if (wallet2.balance < initialBalance2) {
        throw new Error('Insufficient balance for party2');
    }

    // 3. Generate channel ID
    const channelId = createHash('sha256')
        .update(`${party1.address}${party2.address}${Date.now()}`)
        .digest('hex');

    // 4. Create the channel
    await LedgerMethods.ProposeChannel(contract, {
        channelId,
        initialBalance1,
        initialBalance2,
        party1 : {
            address : party1.address,
            publicKey : party1.publicKey,
            balance : 100,
            nonce : 0
        },
        party2 : {
            address : party2.address,
            publicKey : party2.publicKey,
            balance : 100,
            nonce : 0
        }
    });

    return channelId;
}

export async function updateChannelState(
    contract: Contract,
    channelId: string,
    newState: ChannelState,
    timelock: number
): Promise<void> {
    // 1. Submit the time-locked state
    await LedgerMethods.SubmitTimeLockState(
        contract,
        channelId,
        newState,
        timelock
    );

    console.log(`State update submitted with timelock: ${timelock}`);
}

export async function challengeState(
    contract: Contract,
    channelId: string,
    challengeState: ChannelState,
    newTimelock: number
): Promise<void> {
    // Get current channel state
    const channel = await LedgerMethods.GetChannel(contract, channelId);

    // Verify challenge state has higher nonce
    if (challengeState.nonce <= channel.nonce) {
        throw new Error('Challenge state must have higher nonce');
    }

    // Submit challenge state with new timelock
    await LedgerMethods.SubmitTimeLockState(
        contract,
        channelId,
        challengeState,
        newTimelock
    );
}

export async function settleChannel(
    contract: Contract,
    channelId: string,
    finalState: ChannelState
): Promise<void> {
    // 1. Submit final state with immediate timelock
    const currentTime = Math.floor(Date.now() / 1000);
    const DISPUTE_WINDOW = 24 * 60 * 60; // 24 hours
    
    await LedgerMethods.SubmitTimeLockState(
        contract,
        channelId,
        finalState,
        currentTime + DISPUTE_WINDOW
    );

    // 2. Wait for timelock to expire
    console.log(`Channel will be settled after dispute window: ${DISPUTE_WINDOW} seconds`);
}

export async function executeSettlement(
    contract: Contract,
    channelId: string,
    stateNonce: number
): Promise<void> {
    try {
        // Execute the time-locked state
        await LedgerMethods.ExecuteTimeLockState(
            contract,
            channelId,
            stateNonce
        );

        // Get final channel state
        const channel = await LedgerMethods.GetChannel(contract, channelId);

        // Create settlement transactions
        await LedgerMethods.FinalizeChannelClosure(contract, channelId);

        console.log('Channel settled successfully');
    } catch (error) {
        console.error('Error executing settlement:', error);
        throw error;
    }
}

export async function monitorChannelState(
    contract: Contract,
    channelId: string,
    callback: (state: any) => void
): Promise<Function> {
    let lastState = null;
    
    // Poll for state changes
    const interval = setInterval(async () => {
        try {
            const currentState = await LedgerMethods.GetChannel(contract, channelId);
            
            // Check if state has changed
            if (JSON.stringify(currentState) !== JSON.stringify(lastState)) {
                lastState = currentState;
                callback(currentState);
            }
        } catch (error) {
            console.error('Error monitoring channel:', error);
        }
    }, 5000); // Poll every 5 seconds

    // Return cleanup function
    return () => clearInterval(interval);
}