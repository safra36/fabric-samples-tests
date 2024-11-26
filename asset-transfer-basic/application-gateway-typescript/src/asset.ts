


export class PartyAddress {
    public address: string = '';
    public publicKey: string = '';
}

export class Channel {

    public channelId: string = '';
    public party1: PartyAddress = new PartyAddress();
    public party2: PartyAddress = new PartyAddress();
    public balance1: number = 0;
    public balance2: number = 0;
    public status: string = ChannelStatus.PROPOSED;
    public nonce: number = 0;
    public multiSigAddress: string = '';
    public createdAt: number = 0;
    public closedAt?: number;
    public fundingTxId?: string;
    public settlementTx1Id?: string;
    public settlementTx2Id?: string;

}

export enum ChannelStatus {
    PROPOSED = 'PROPOSED',
    ACTIVE = 'ACTIVE',
    CLOSING = 'CLOSING',
    CLOSED = 'CLOSED',
    DISPUTED = 'DISPUTED'
}

export class ChannelState {

    public channelId: string = '';
    public balance1: number = 0;
    public balance2: number = 0;
    public nonce: number = 0;
    public signature1: string = '';  // Changed from signatures array to individual properties
    public signature2: string = '';  // Changed from signatures array to individual properties

}



export class Wallet {
    public address: string = '';
    public publicKey: string = '';
    public balance: number = 0;
    public nonce: number = 0;  // For transaction ordering
}

export class Transaction {
    public txId: string = '';
    public fromAddress: string = '';
    public toAddress: string = '';
    public amount: number = 0;
    public timestamp: number = 0;
    public type: TransactionType = TransactionType.REGULAR;
    public status: TransactionStatus = TransactionStatus.PENDING;
    public channelId?: string;  // If related to a payment channel
    public timelock?: number;   // Optional timelock timestamp
}

export class TimeLockState {
    public channelId: string = '';
    public state: ChannelState = new ChannelState()
    public timelock: number = 0;  // Timestamp when state can be submitted
    public sequence: number = 0;  // For ordering states
    public submittedBy?: string;  // Address of party who submitted
}

export enum TransactionType {
    REGULAR = 'REGULAR',
    CHANNEL_FUNDING = 'CHANNEL_FUNDING',
    CHANNEL_SETTLEMENT = 'CHANNEL_SETTLEMENT',
    TIMELOCK_SETTLEMENT = 'TIMELOCK_SETTLEMENT'
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED'
}



export interface CreateChannelParams {
    channelId: string;
    party1: Wallet;
    party2: Wallet;
    initialBalance1: number;
    initialBalance2: number;
}

export interface ActivateChannelParams {
    channelId: string;
    fundingTxId: string;
}

export interface CloseChannelParams {
    channelId: string;
    finalState: ChannelState;
}