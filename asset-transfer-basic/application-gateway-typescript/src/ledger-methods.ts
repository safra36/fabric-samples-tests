import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { ActivateChannelParams, Channel, ChannelState, CloseChannelParams, CreateChannelParams, Transaction, Wallet } from './asset';
import { WalletUtils } from './wallet.utils';

const utf8Decoder = new TextDecoder();

export const LedgerMethods = {
    /**
     * @description peer chaincode query -C mychannel -n basic -c '{"function":"GetChannel","Args":["channel1"]}'
     */
    GetChannel: async (contract: Contract, channelName : string) : Promise<Channel> => {
        const args: string[] = [ channelName ];
        const resultBytes = await contract.evaluateTransaction(
            'GetChannel',
            ...args
        );

        const resultJson = utf8Decoder.decode(resultBytes);
        const result: unknown = JSON.parse(resultJson);
        console.log('*** Result:', result);
        return result as Channel
    },
    /**
     * @description peer chaincode invoke -o localhost:7050   --ordererTLSHostnameOverride orderer.example.com   --tls --cafile $ORDERER_CA   --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA   --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA   -C mychannel   -n basic   --waitForEvent
     * -c '{"function":"ProposeChannel","Args":["channel1", "party1addr", "party1pubkey", "party2addr", "party2pubkey", "100", "100"]}'
     */
    ProposeChannel: async (
        contract: Contract,
        params: CreateChannelParams
    ): Promise<void> => {
        await contract.submitTransaction(
            'ProposeChannel',
            params.channelId,
            params.party1.address,
            params.party1.publicKey,
            params.party2.address,
            params.party2.publicKey,
            params.initialBalance1.toString(),
            params.initialBalance2.toString()
        );
    },
    // Wallet Management
    CreateWallet: async (
        contract: Contract,
        address: string,
        publicKey: string
    ): Promise<void> => {
        await contract.submitTransaction(
            'CreateWallet',
            address,
            publicKey
        );
    },

    GetWallet: async (
        contract: Contract,
        address: string
    ): Promise<Wallet> => {
        const resultBytes = await contract.evaluateTransaction(
            'GetWallet',
            address
        );
        return JSON.parse(utf8Decoder.decode(resultBytes));
    },

    Transfer: async (
        contract: Contract,
        fromAddress: string,
        toAddress: string,
        amount: number,
        privateKey: string
    ): Promise<void> => {
        // Create signature for the transfer
        const fromWallet = await LedgerMethods.GetWallet(contract, fromAddress);
        const txData = `${fromAddress}${toAddress}${amount}${fromWallet.nonce}`;
        const signature = WalletUtils.sign(txData, privateKey);

        await contract.submitTransaction(
            'Transfer',
            fromAddress,
            toAddress,
            amount.toString(),
            signature
        );
    },

    // Channel Management
    SubmitTimeLockState: async (
        contract: Contract,
        channelId: string,
        state: ChannelState,
        timelock: number
    ): Promise<void> => {
        await contract.submitTransaction(
            'SubmitTimeLockState',
            channelId,
            JSON.stringify(state),
            timelock.toString()
        );
    },

    ExecuteTimeLockState: async (
        contract: Contract,
        channelId: string,
        stateNonce: number
    ): Promise<void> => {
        await contract.submitTransaction(
            'ExecuteTimeLockState',
            channelId,
            stateNonce.toString()
        );
    },

    GetTransactionHistory: async (
        contract: Contract,
        address: string
    ): Promise<Transaction[]> => {
        const resultBytes = await contract.evaluateTransaction(
            'GetTransactionHistory',
            address
        );
        return JSON.parse(utf8Decoder.decode(resultBytes));
    },
    /**
     * Create a new payment channel
     * @param contract Fabric contract instance
     * @param params Channel creation parameters
     */
    CreateChannel: async (contract: Contract, params: CreateChannelParams): Promise<void> => {
        console.log('*** Creating channel with params:', params);

        await contract.submitTransaction(
            'ProposeChannel',
            params.channelId,
            params.party1.address,
            params.party1.publicKey,
            params.party2.address,
            params.party2.publicKey,
            params.initialBalance1.toString(),
            params.initialBalance2.toString()
        );

        console.log('*** Channel created successfully');
    },

    /**
     * Activate a payment channel after funding
     * @param contract Fabric contract instance
     * @param params Channel activation parameters
     */
    ActivateChannel: async (contract: Contract, params: ActivateChannelParams): Promise<void> => {
        console.log('*** Activating channel:', params);

        await contract.submitTransaction(
            'ActivateChannel',
            params.channelId,
            params.fundingTxId
        );

        console.log('*** Channel activated successfully');
    },

    /**
     * Initiate channel closure with final state
     * @param contract Fabric contract instance
     * @param params Channel closure parameters
     */
    InitiateChannelClosure: async (contract: Contract, params: CloseChannelParams): Promise<void> => {
        console.log('*** Initiating channel closure:', params);

        await contract.submitTransaction(
            'InitiateChannelClosure',
            params.channelId,
            JSON.stringify(params.finalState)
        );

        console.log('*** Channel closure initiated successfully');
    },

    /**
     * Finalize channel closure after dispute period
     * @param contract Fabric contract instance
     * @param channelId Channel identifier
     */
    FinalizeChannelClosure: async (contract: Contract, channelId: string): Promise<void> => {
        console.log('*** Finalizing channel closure for:', channelId);

        await contract.submitTransaction(
            'FinalizeChannelClosure',
            channelId
        );

        console.log('*** Channel closed successfully');
    },

    /**
     * Submit a dispute for a channel in closing state
     * @param contract Fabric contract instance
     * @param channelId Channel identifier
     * @param disputeState The disputed channel state
     */
    DisputeChannel: async (
        contract: Contract,
        channelId: string,
        disputeState: ChannelState
    ): Promise<void> => {
        console.log('*** Submitting dispute for channel:', channelId);

        await contract.submitTransaction(
            'DisputeChannel',
            channelId,
            JSON.stringify(disputeState)
        );

        console.log('*** Dispute submitted successfully');
    },

    /**
     * Get settlement transactions for a closed channel
     * @param contract Fabric contract instance
     * @param channelId Channel identifier
     */
    GetSettlementTransactions: async (contract: Contract, channelId: string): Promise<any> => {
        const resultBytes = await contract.evaluateTransaction(
            'GetSettlementTransactions',
            channelId
        );

        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);
        console.log('*** Settlement transactions:', result);
        return result;
    },
};
