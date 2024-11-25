
/*
 * SPDX-License-Identifier: Apache-2.0
 */


import { Context, Contract, Info, Transaction } from 'fabric-contract-api';
import { ChannelUtils } from './utils';
import { Channel, ChannelState, ChannelStatus, PartyAddress } from './asset';
// import { Channel, ChannelState, ChannelStatus, PartyAddress } from './asset';


@Info({ title: 'PaymentChannelContract', description: 'Smart contract for payment channels' })
export class PaymentChannelContract extends Contract {



    @Transaction()
    public async ProposeChannel(
        ctx: Context,
        channelId: string,
        party1Address: string,
        party1PubKey: string,
        party2Address: string,
        party2PubKey: string,
        initialBalance1: number,
        initialBalance2: number
    ): Promise<void> {
        const exists = await ChannelUtils.getState(ctx, channelId);
        if (exists) {
            throw new Error(`Channel ${channelId} already exists`);
        }

        const party1: PartyAddress = { address: party1Address, publicKey: party1PubKey };
        const party2: PartyAddress = { address: party2Address, publicKey: party2PubKey };

        const channel: Channel = {
            channelId,
            party1,
            party2,
            balance1: initialBalance1,
            balance2: initialBalance2,
            status: ChannelStatus.PROPOSED,
            nonce: 0,
            multiSigAddress: ChannelUtils.generateMultiSigAddress(party1, party2),
            createdAt: ctx.stub.getTxTimestamp().seconds.toNumber()
        };

        console.log(channel);
        

        await ChannelUtils.putState(ctx, channelId, channel);
    }


    @Transaction()
    public async ActivateChannel(
        ctx: Context,
        channelId: string,
        fundingTxId: string
    ): Promise<void> {
        const channel = await ChannelUtils.getState(ctx, channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} does not exist`);
        }
        if (channel.status !== ChannelStatus.PROPOSED) {
            throw new Error(`Channel ${channelId} is not in PROPOSED state`);
        }

        // Verify funding transaction
        const expectedAmount = channel.balance1 + channel.balance2;
        const fundingTx = await this.verifyFundingTransaction(ctx, fundingTxId, channel.multiSigAddress, expectedAmount);
        if (!fundingTx) {
            throw new Error('Invalid or insufficient funding transaction');
        }

        channel.status = ChannelStatus.ACTIVE;
        channel.fundingTxId = fundingTxId;
        await ChannelUtils.putState(ctx, channelId, channel);
    }

    @Transaction()
    public async InitiateChannelClosure(
        ctx: Context,
        channelId: string,
        finalState: ChannelState
    ): Promise<void> {
        const channel = await ChannelUtils.getState(ctx, channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} does not exist`);
        }
        if (channel.status !== ChannelStatus.ACTIVE) {
            throw new Error(`Channel ${channelId} is not active`);
        }

        if (!ChannelUtils.validateSignatures(finalState, channel.party1, channel.party2)) {
            throw new Error('Invalid signatures on final state');
        }

        if (finalState.nonce <= channel.nonce) {
            throw new Error('Final state nonce must be greater than current nonce');
        }

        channel.status = ChannelStatus.CLOSING;
        channel.balance1 = finalState.balance1;
        channel.balance2 = finalState.balance2;
        channel.nonce = finalState.nonce;

        await ChannelUtils.putState(ctx, channelId, channel);
    }

    @Transaction()
    public async FinalizeChannelClosure(
        ctx: Context,
        channelId: string
    ): Promise<void> {
        const channel = await ChannelUtils.getState(ctx, channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} does not exist`);
        }
        if (channel.status !== ChannelStatus.CLOSING) {
            throw new Error(`Channel ${channelId} is not in closing state`);
        }

        const currentTime = ctx.stub.getTxTimestamp().seconds;
        const DISPUTE_PERIOD = 24 * 60 * 60; // 24 hours

        if (currentTime < channel.createdAt + DISPUTE_PERIOD) {
            throw new Error('Dispute period has not ended');
        }

        // Create settlement transactions
        const settlementTx1 = {
            from: channel.multiSigAddress,
            to: channel.party1.address,
            amount: channel.balance1,
            channelId: channel.channelId,
            type: 'SETTLEMENT'
        };

        const settlementTx2 = {
            from: channel.multiSigAddress,
            to: channel.party2.address,
            amount: channel.balance2,
            channelId: channel.channelId,
            type: 'SETTLEMENT'
        };

        // Store settlement transactions
        await ChannelUtils.putState(ctx, `${channelId}_settlement1`, settlementTx1);
        await ChannelUtils.putState(ctx, `${channelId}_settlement2`, settlementTx2);

        channel.status = ChannelStatus.CLOSED;
        channel.closedAt = currentTime;
        channel.settlementTx1Id = `${channelId}_settlement1`;
        channel.settlementTx2Id = `${channelId}_settlement2`;

        await ChannelUtils.putState(ctx, channelId, channel);
    }

    private async verifyFundingTransaction(
        ctx: Context,
        txId: string,
        multiSigAddress: string,
        expectedAmount: number
    ): Promise<boolean> {
        // Get transaction from ledger
        const txBytes = await ctx.stub.getState(txId);
        if (!txBytes || txBytes.length === 0) {
            return false;
        }

        const tx = JSON.parse(txBytes.toString());
        return (
            tx.recipient === multiSigAddress &&
            tx.amount >= expectedAmount &&
            tx.status === 'CONFIRMED'
        );
    }

    @Transaction()
    public async GetSettlementTransactions(
        ctx: Context,
        channelId: string
    ): Promise<string> {
        const channel = await ChannelUtils.getState(ctx, channelId);
        if (!channel || channel.status !== ChannelStatus.CLOSED) {
            throw new Error(`No settlement transactions for channel ${channelId}`);
        }

        const tx1 = await ChannelUtils.getState(ctx, channel.settlementTx1Id);
        const tx2 = await ChannelUtils.getState(ctx, channel.settlementTx2Id);

        return JSON.stringify({
            settlement1: tx1,
            settlement2: tx2
        });
    }



    @Transaction()
    public async DisputeChannel(
        ctx: Context,
        channelId: string,
        disputeState: ChannelState
    ): Promise<void> {
        const channel = await ChannelUtils.getState(ctx, channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} does not exist`);
        }
        if (channel.status !== ChannelStatus.CLOSING) {
            throw new Error(`Channel ${channelId} is not in closing state`);
        }

        if (!ChannelUtils.validateSignatures(disputeState, channel.party1, channel.party2)) {
            throw new Error('Invalid signatures on dispute state');
        }

        if (disputeState.nonce <= channel.nonce) {
            throw new Error('Dispute state nonce must be greater than current nonce');
        }

        channel.status = ChannelStatus.DISPUTED;
        channel.balance1 = disputeState.balance1;
        channel.balance2 = disputeState.balance2;
        channel.nonce = disputeState.nonce;

        await ChannelUtils.putState(ctx, channelId, channel);
    }



    @Transaction(false)
    public async GetChannel(
        ctx: Context,
        channelId: string
    ): Promise<string> {
        const channel = await ChannelUtils.getState(ctx, channelId);

        console.log("Fetched channel", channel);
        

        if (!channel) {
            throw new Error(`Channel ${channelId} does not exist`);
        }
        return JSON.stringify(channel);
    }
}
